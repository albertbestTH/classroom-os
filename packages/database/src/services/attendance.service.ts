import type {
  AttendanceRecordResult,
  BatchServiceResult,
  UpdateAttendanceBatchInput,
} from "@classroom-os/types";

import { getPrismaClient } from "../client.js";
import { domainError } from "../domain-errors.js";
import { createAuditLogForSchool } from "../repositories/audit.repository.js";
import {
  findUnenrolledStudentIdsForSchool,
  requireAttendanceSessionForSchool,
  upsertAttendanceBatchForSchool,
} from "../repositories/attendance.repository.js";
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
      const results = records.map(toAttendanceResult);
      return { count: results.length, records: results };
    });
  });
}
