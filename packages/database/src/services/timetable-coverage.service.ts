import type {
  TimetableCoverageKind,
  TimetableCoverageResult,
  TimetableCoverageStatus,
  UserRole,
} from "@classroom-os/types";
import { z } from "zod";

import { getPrismaClient } from "../client.js";
import { domainError } from "../domain-errors.js";
import { createAuditLogForSchool } from "../repositories/audit.repository.js";
import {
  createCoverageForSchool,
  listCoveragesForSchool,
  requireCoverageForSchool,
  updateCoverageForSchool,
  type TimetableCoverageWithDetails,
} from "../repositories/timetable-coverage.repository.js";
import { requireTimetableEntryDetailsForSchool } from "../repositories/timetable.repository.js";
import { executeTenantService } from "./service-utils.js";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const requestSchema = z.object({
  schoolId: z.uuid(),
  actorUserId: z.uuid(),
  actorRole: z.enum(["SCHOOL_OWNER", "ADMIN", "TEACHER"]),
  actorTeacherId: z.uuid().nullable(),
  timetableEntryId: z.uuid(),
  substituteTeacherId: z.uuid(),
  localDate: z.string().regex(datePattern),
  kind: z.enum(["cover", "swap"]),
  reciprocalEntryId: z.uuid().nullable().optional(),
  reason: z.string().trim().max(500).nullable().optional(),
});

function dateOnly(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw domainError("VALIDATION_ERROR", "localDate must be a valid ISO date.");
  }
  return date;
}

export function toTimetableCoverageResult(item: TimetableCoverageWithDetails): TimetableCoverageResult {
  return {
    id: item.id,
    schoolId: item.schoolId,
    timetableEntryId: item.timetableEntryId,
    reciprocalEntryId: item.reciprocalEntryId,
    originalTeacherId: item.originalTeacherId,
    originalTeacherName: `${item.originalTeacher.firstName} ${item.originalTeacher.lastName}`,
    substituteTeacherId: item.substituteTeacherId,
    substituteTeacherName: `${item.substituteTeacher.firstName} ${item.substituteTeacher.lastName}`,
    localDate: item.localDate.toISOString().slice(0, 10),
    kind: item.kind,
    status: item.status,
    reason: item.reason,
    resolvedAt: item.resolvedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
  };
}

export function requestTimetableCoverage(input: {
  schoolId: string;
  actorUserId: string;
  actorRole: UserRole;
  actorTeacherId: string | null;
  timetableEntryId: string;
  substituteTeacherId: string;
  localDate: string;
  kind: TimetableCoverageKind;
  reciprocalEntryId?: string | null;
  reason?: string | null;
}): Promise<TimetableCoverageResult> {
  return executeTenantService(input, async () => {
    const parsed = requestSchema.parse(input);
    const localDate = dateOnly(parsed.localDate);
    return getPrismaClient().$transaction(async (transaction) => {
      const entry = await requireTimetableEntryDetailsForSchool(transaction, parsed);
      if (parsed.actorRole === "TEACHER" && parsed.actorTeacherId !== entry.teacherId) {
        throw domainError("TENANT_ACCESS_DENIED", "Only the timetable owner can request coverage.");
      }
      if (entry.teacherId === parsed.substituteTeacherId) {
        throw domainError("VALIDATION_ERROR", "The substitute teacher must be different.");
      }
      if (localDate.getUTCDay() !== entry.weekday) {
        throw domainError("VALIDATION_ERROR", "localDate must match the timetable weekday.");
      }
      const term = entry.teachingAssignment.term;
      if (localDate < term.startsOn || localDate > term.endsOn) {
        throw domainError("VALIDATION_ERROR", "localDate must be inside the assignment term.");
      }
      const substitute = await transaction.teacher.findFirst({
        where: { id: parsed.substituteTeacherId, schoolId: parsed.schoolId, isActive: true },
        select: { id: true },
      });
      if (!substitute) throw domainError("NOT_FOUND", "The substitute teacher was not found.");

      let reciprocalEntryId: string | null = null;
      if (parsed.kind === "swap") {
        if (!parsed.reciprocalEntryId) {
          throw domainError("VALIDATION_ERROR", "A reciprocal timetable entry is required for a swap.");
        }
        const reciprocal = await requireTimetableEntryDetailsForSchool(transaction, {
          schoolId: parsed.schoolId,
          timetableEntryId: parsed.reciprocalEntryId,
        });
        if (reciprocal.teacherId !== parsed.substituteTeacherId || reciprocal.weekday !== entry.weekday) {
          throw domainError("VALIDATION_ERROR", "The reciprocal entry must belong to the substitute on the same weekday.");
        }
        reciprocalEntryId = reciprocal.id;
      }

      const coverage = await createCoverageForSchool(transaction, {
        schoolId: parsed.schoolId,
        data: {
          timetableEntryId: entry.id,
          reciprocalEntryId,
          originalTeacherId: entry.teacherId,
          substituteTeacherId: parsed.substituteTeacherId,
          localDate,
          kind: parsed.kind,
          status: "pending",
          reason: parsed.reason ?? null,
          requestedByUserId: parsed.actorUserId,
        },
      });
      await createAuditLogForSchool(transaction, {
        schoolId: parsed.schoolId,
        actorUserId: parsed.actorUserId,
        action: "timetable.coverage.requested",
        entityType: "TimetableCoverage",
        entityId: coverage.id,
        metadata: { kind: coverage.kind, localDate: parsed.localDate },
      });
      return toTimetableCoverageResult(coverage);
    });
  });
}

export function resolveTimetableCoverage(input: {
  schoolId: string;
  actorUserId: string;
  actorRole: UserRole;
  actorTeacherId: string | null;
  coverageId: string;
  status: Extract<TimetableCoverageStatus, "active" | "declined" | "cancelled">;
}): Promise<TimetableCoverageResult> {
  return executeTenantService(input, async () => {
    const parsed = z.object({
      schoolId: z.uuid(), actorUserId: z.uuid(),
      actorRole: z.enum(["SCHOOL_OWNER", "ADMIN", "TEACHER"]),
      actorTeacherId: z.uuid().nullable(), coverageId: z.uuid(),
      status: z.enum(["active", "declined", "cancelled"]),
    }).parse(input);
    return getPrismaClient().$transaction(async (transaction) => {
      const current = await requireCoverageForSchool(transaction, parsed);
      if (current.status !== "pending" && parsed.status !== "cancelled") {
        throw domainError("INVALID_STATE_TRANSITION", "Only pending coverage can be accepted or declined.");
      }
      const isManager = parsed.actorRole !== "TEACHER";
      const isSubstitute = parsed.actorTeacherId === current.substituteTeacherId;
      const isOriginal = parsed.actorTeacherId === current.originalTeacherId;
      if (parsed.status === "cancelled" ? !(isManager || isOriginal) : !(isManager || isSubstitute)) {
        throw domainError("TENANT_ACCESS_DENIED", "You cannot resolve this coverage request.");
      }
      if (parsed.status === "active") {
        const source = await requireTimetableEntryDetailsForSchool(transaction, {
          schoolId: parsed.schoolId,
          timetableEntryId: current.timetableEntryId,
        });
        const substituteConflict = await transaction.timetableEntry.findFirst({
          where: {
            schoolId: parsed.schoolId,
            termId: source.termId,
            teacherId: current.substituteTeacherId,
            weekday: source.weekday,
            isActive: true,
            startTime: { lt: source.endTime },
            endTime: { gt: source.startTime },
            ...(current.reciprocalEntryId ? { id: { not: current.reciprocalEntryId } } : {}),
          },
          select: { id: true },
        });
        if (substituteConflict) {
          throw domainError("CONFLICT", "The substitute teacher has an overlapping timetable entry.");
        }
        if (current.kind === "swap" && current.reciprocalEntryId) {
          const reciprocal = await requireTimetableEntryDetailsForSchool(transaction, {
            schoolId: parsed.schoolId,
            timetableEntryId: current.reciprocalEntryId,
          });
          const originalConflict = await transaction.timetableEntry.findFirst({
            where: {
              schoolId: parsed.schoolId,
              termId: reciprocal.termId,
              teacherId: current.originalTeacherId,
              weekday: reciprocal.weekday,
              isActive: true,
              startTime: { lt: reciprocal.endTime },
              endTime: { gt: reciprocal.startTime },
              id: { not: current.timetableEntryId },
            },
            select: { id: true },
          });
          if (originalConflict) {
            throw domainError("CONFLICT", "The original teacher has an overlapping timetable entry after the swap.");
          }
        }
        const activeCoverages = await transaction.timetableCoverage.findMany({
          where: {
            schoolId: parsed.schoolId,
            localDate: current.localDate,
            status: "active",
            substituteTeacherId: current.substituteTeacherId,
            id: { not: current.id },
          },
          include: { timetableEntry: true },
        });
        if (activeCoverages.some((item) => item.timetableEntry.startTime < source.endTime && item.timetableEntry.endTime > source.startTime)) {
          throw domainError("CONFLICT", "The substitute teacher already has overlapping approved coverage.");
        }
      }
      await updateCoverageForSchool(transaction, {
        schoolId: parsed.schoolId,
        coverageId: current.id,
        data: {
          status: parsed.status,
          resolvedByUserId: parsed.actorUserId,
          resolvedAt: new Date(),
        },
      });
      await createAuditLogForSchool(transaction, {
        schoolId: parsed.schoolId,
        actorUserId: parsed.actorUserId,
        action: `timetable.coverage.${parsed.status}`,
        entityType: "TimetableCoverage",
        entityId: current.id,
        metadata: { previousStatus: current.status },
      });
      return toTimetableCoverageResult(await requireCoverageForSchool(transaction, parsed));
    });
  });
}

export function listTimetableCoverages(input: {
  schoolId: string;
  teacherId?: string;
  localDate?: string;
  status?: TimetableCoverageStatus;
}): Promise<TimetableCoverageResult[]> {
  return executeTenantService(input, async () => {
    const items = await listCoveragesForSchool(getPrismaClient(), {
      ...input,
      localDate: input.localDate ? dateOnly(input.localDate) : undefined,
    });
    return items.map(toTimetableCoverageResult);
  });
}
