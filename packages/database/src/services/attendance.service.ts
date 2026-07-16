import type {
  AttendanceRecordResult,
  BatchServiceResult,
  SessionAttendanceResult,
  UpdateAttendanceBatchInput,
} from "@classroom-os/types";

import { getPrismaClient } from "../client.js";
import { domainError } from "../domain-errors.js";
import { createAuditLogForSchool } from "../repositories/audit.repository.js";
import {
  findUnenrolledStudentIdsForSchool,
  listAttendanceForSessionForSchool,
  listAttendanceRosterForSchool,
  requireAttendanceSessionForSchool,
  upsertAttendanceBatchForSchool,
} from "../repositories/attendance.repository.js";
import { createSessionTimelineEventForSchool } from "../repositories/session-timeline.repository.js";
import { requireTenantReferencesForSchool } from "../repositories/reference.repository.js";
import { updateAttendanceBatchSchema } from "../validation.js";
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

      const records = await upsertAttendanceBatchForSchool(transaction, {
        schoolId: parsed.schoolId,
        sessionId: parsed.sessionId,
        actorUserId: parsed.actorUserId,
        records: parsed.records,
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
        status: record?.status ?? null,
        note: record?.note ?? null,
        recordedAt: record?.recordedAt.toISOString() ?? null,
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

export function listAttendanceForSession(input: {
  schoolId: string;
  sessionId: string;
}): Promise<AttendanceRecordResult[]> {
  return executeTenantService(input, async () => {
    const records = await listAttendanceForSessionForSchool(getPrismaClient(), input);
    return records.map(toAttendanceResult);
  });
}
