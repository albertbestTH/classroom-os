import type {
  AttendanceRecordResult,
  AttendanceCorrectionResult,
  BatchServiceResult,
  CorrectAttendanceInput,
  SessionAttendanceResult,
  TrustedAuthContext,
  UpdateAttendanceBatchInput,
} from "@classroom-os/types";

import { getPrismaClient } from "../client.js";
import { requireRole, requireSchoolAccess } from "../auth/authorization.js";
import { domainError } from "../domain-errors.js";
import { createAuditLogForSchool } from "../repositories/audit.repository.js";
import {
  createAttendanceCorrectionForSchool,
  findUnenrolledStudentIdsForSchool,
  listAttendanceForSessionForSchool,
  listAttendanceRosterForSchool,
  requireAttendanceRecordForCorrectionForSchool,
  requireAttendanceSessionForSchool,
  updateAttendanceRecordAfterCorrectionForSchool,
  upsertAttendanceBatchForSchool,
} from "../repositories/attendance.repository.js";
import { createSessionTimelineEventForSchool } from "../repositories/session-timeline.repository.js";
import { requireTenantReferencesForSchool } from "../repositories/reference.repository.js";
import { correctAttendanceSchema, updateAttendanceBatchSchema } from "../validation.js";
import { executeTenantService, toAttendanceResult } from "./service-utils.js";

export function updateAttendanceBatch(
  input: UpdateAttendanceBatchInput,
): Promise<BatchServiceResult<AttendanceRecordResult>> {
  return executeTenantService(input, async () => {
    const parsed = updateAttendanceBatchSchema.parse(input);
    return getPrismaClient().$transaction(async (transaction) => {
      const session = await requireAttendanceSessionForSchool(transaction, parsed);
      if (session.status === "completed" || session.status === "cancelled") {
        throw domainError(
          "INVALID_STATE_TRANSITION",
          "Attendance cannot be edited for a completed or cancelled session.",
          { currentStatus: session.status },
        );
      }

      if (parsed.actorUserId) {
        await requireTenantReferencesForSchool(transaction, {
          schoolId: parsed.schoolId,
          userId: parsed.actorUserId,
        });
      }

      const studentIds = parsed.records.map(({ studentId }) => studentId);
      const unenrolled = await findUnenrolledStudentIdsForSchool(transaction, {
        schoolId: parsed.schoolId,
        termId: session.termId,
        classroomId: session.classroomId,
        studentIds,
      });
      if (unenrolled.length > 0) {
        throw domainError(
          "VALIDATION_ERROR",
          "Attendance can only be recorded for enrolled students.",
          { studentIds: unenrolled },
        );
      }

      const existing = new Map(
        (await listAttendanceForSessionForSchool(transaction, parsed)).map((record) => [
          record.studentId,
          record,
        ]),
      );
      const changedRecords = parsed.records.filter((record) => {
        const current = existing.get(record.studentId);
        return !current || current.status !== record.status || current.note !== (record.note ?? null);
      });
      if (changedRecords.length === 0) return { count: 0, records: [] };

      const records = await upsertAttendanceBatchForSchool(transaction, {
        schoolId: parsed.schoolId,
        sessionId: parsed.sessionId,
        actorUserId: parsed.actorUserId,
        records: changedRecords,
      });
      await createAuditLogForSchool(transaction, {
        schoolId: parsed.schoolId,
        actorUserId: parsed.actorUserId,
        action: "attendance.batch_updated",
        entityType: "ClassSession",
        entityId: session.id,
        metadata: { count: records.length },
      });
      const statusCounts = records.reduce<Record<string, number>>((counts, record) => {
        counts[record.status] = (counts[record.status] ?? 0) + 1;
        return counts;
      }, {});
      await createSessionTimelineEventForSchool(transaction, {
        schoolId: parsed.schoolId,
        classSessionId: session.id,
        actorUserId: parsed.actorUserId,
        eventType: "ATTENDANCE_UPDATED",
        metadata: { count: records.length, statusCounts },
      });
      const results = records.map(toAttendanceResult);
      return { count: results.length, records: results };
    });
  });
}

export function getSessionAttendanceRoster(input: {
  schoolId: string;
  sessionId: string;
}): Promise<SessionAttendanceResult> {
  return executeTenantService(input, async () => {
    const { session, enrollments, records } = await listAttendanceRosterForSchool(
      getPrismaClient(),
      input,
    );
    const byStudent = new Map(records.map((record) => [record.studentId, record]));
    const students = enrollments.map(({ student }) => {
      const record = byStudent.get(student.id);
      return {
        studentId: student.id,
        studentNumber: student.studentNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        preferredName: student.preferredName,
        profileImageKey: student.profileImageKey,
        status: record?.status ?? null,
        note: record?.note ?? null,
        recordedAt: record?.recordedAt.toISOString() ?? null,
        recordUpdatedAt: record?.updatedAt.toISOString() ?? null,
        corrections: (record?.corrections ?? []).map(toAttendanceCorrectionResult),
      };
    });
    return {
      sessionId: session.id,
      classroomId: session.classroomId,
      status: session.status,
      students,
      recordedCount: records.length,
      enrolledCount: students.length,
    };
  });
}

function toAttendanceCorrectionResult(
  correction: Awaited<ReturnType<typeof createAttendanceCorrectionForSchool>>,
): AttendanceCorrectionResult {
  return {
    id: correction.id,
    attendanceRecordId: correction.attendanceRecordId,
    classSessionId: correction.classSessionId,
    studentId: correction.studentId,
    actorUserId: correction.actorUserId,
    actorName: correction.actor
      ? `${correction.actor.firstName} ${correction.actor.lastName}`
      : null,
    beforeStatus: correction.beforeStatus,
    afterStatus: correction.afterStatus,
    beforeNote: correction.beforeNote,
    afterNote: correction.afterNote,
    reason: correction.reason,
    createdAt: correction.createdAt.toISOString(),
  };
}

export function correctCompletedAttendance(
  input: CorrectAttendanceInput & { auth: TrustedAuthContext },
): Promise<AttendanceCorrectionResult> {
  return executeTenantService(input, async () => {
    const auth = requireRole(requireSchoolAccess(input.auth, input.schoolId), [
      "SCHOOL_OWNER",
      "ADMIN",
    ]);
    const parsed = correctAttendanceSchema.parse({
      ...input,
      actorUserId: auth.userId,
    });
    return getPrismaClient().$transaction(async (transaction) => {
      const session = await requireAttendanceSessionForSchool(transaction, parsed);
      if (session.status !== "completed") {
        throw domainError(
          "INVALID_STATE_TRANSITION",
          "Only completed session attendance can be corrected.",
          { currentStatus: session.status },
        );
      }
      const unenrolled = await findUnenrolledStudentIdsForSchool(transaction, {
        schoolId: parsed.schoolId,
        termId: session.termId,
        classroomId: session.classroomId,
        studentIds: [parsed.studentId],
      });
      if (unenrolled.length) {
        throw domainError(
          "VALIDATION_ERROR",
          "Attendance corrections are limited to enrolled students in this class.",
        );
      }
      const before = await requireAttendanceRecordForCorrectionForSchool(transaction, parsed);
      const afterNote = parsed.note ?? null;
      if (before.status === parsed.status && before.note === afterNote) {
        throw domainError("CONFLICT", "The correction must change the attendance value.");
      }
      const updated = await updateAttendanceRecordAfterCorrectionForSchool(transaction, {
        schoolId: parsed.schoolId,
        attendanceRecordId: before.id,
        expectedUpdatedAt: new Date(parsed.expectedRecordUpdatedAt),
        actorUserId: auth.userId,
        status: parsed.status,
        note: afterNote,
      });
      if (!updated) {
        throw domainError(
          "CONFLICT",
          "Attendance changed after this page was loaded. Refresh and review before retrying.",
        );
      }
      const correction = await createAttendanceCorrectionForSchool(transaction, {
        schoolId: parsed.schoolId,
        attendanceRecordId: before.id,
        classSessionId: session.id,
        studentId: parsed.studentId,
        actorUserId: auth.userId,
        beforeStatus: before.status,
        afterStatus: updated.status,
        beforeNote: before.note,
        afterNote: updated.note,
        reason: parsed.reason,
      });
      await createSessionTimelineEventForSchool(transaction, {
        schoolId: parsed.schoolId,
        classSessionId: session.id,
        actorUserId: auth.userId,
        eventType: "ATTENDANCE_CORRECTED",
        metadata: {
          correctionId: correction.id,
          studentId: parsed.studentId,
          beforeStatus: before.status,
          afterStatus: updated.status,
        },
      });
      await createAuditLogForSchool(transaction, {
        schoolId: parsed.schoolId,
        actorUserId: auth.userId,
        action: "attendance.corrected",
        entityType: "AttendanceCorrection",
        entityId: correction.id,
        metadata: {
          classSessionId: session.id,
          attendanceRecordId: before.id,
          beforeStatus: before.status,
          afterStatus: updated.status,
        },
      });
      return toAttendanceCorrectionResult(correction);
    });
  });
}

export function listAttendanceForSession(input: {
  schoolId: string;
  sessionId: string;
}): Promise<AttendanceRecordResult[]> {
  return executeTenantService(input, async () => {
    const records = await listAttendanceForSessionForSchool(getPrismaClient(), input);
    return records.map(toAttendanceResult);
  });
}
