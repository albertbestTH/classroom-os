import type {
  CreateTimetableEntryInput,
  TenantServiceInput,
  TimetableEntryResult,
  UpdateTimetableEntryInput,
} from "@classroom-os/types";

import { getPrismaClient } from "../client.js";
import { domainError } from "../domain-errors.js";
import { createAuditLogForSchool } from "../repositories/audit.repository.js";
import { requireTenantReferencesForSchool } from "../repositories/reference.repository.js";
import {
  createTimetableEntryForSchool,
  findTimetableOverlapForSchool,
  listTimetableEntriesForSchool,
  requireTimetableEntryForSchool,
  updateTimetableEntryForSchool,
} from "../repositories/timetable.repository.js";
import {
  createTimetableEntrySchema,
  updateTimetableEntrySchema,
} from "../validation.js";
import {
  clockStringToDate,
  executeTenantService,
  toTimetableEntryResult,
} from "./service-utils.js";

function throwOverlap(
  overlap: { teacherId: string; classroomId: string },
  teacherId: string,
): never {
  const conflict = overlap.teacherId === teacherId ? "teacher" : "classroom";
  throw domainError(
    "CONFLICT",
    `The ${conflict} already has an overlapping timetable entry.`,
    { conflict },
  );
}

export function createTimetableEntry(
  input: CreateTimetableEntryInput,
): Promise<TimetableEntryResult> {
  return executeTenantService(input, async () => {
    const parsed = createTimetableEntrySchema.parse(input);
    const startTime = clockStringToDate(parsed.startTime);
    const endTime = clockStringToDate(parsed.endTime);

    return getPrismaClient().$transaction(async (transaction) => {
      const overlap = await findTimetableOverlapForSchool(transaction, {
        ...parsed,
        startTime,
        endTime,
      });
      if (overlap) throwOverlap(overlap, parsed.teacherId);

      const entry = await createTimetableEntryForSchool(transaction, {
        schoolId: parsed.schoolId,
        data: {
          termId: parsed.termId,
          teacherId: parsed.teacherId,
          classroomId: parsed.classroomId,
          subjectId: parsed.subjectId,
          weekday: parsed.weekday,
          startTime,
          endTime,
          room: parsed.room ?? null,
          isActive: true,
        },
      });
      await createAuditLogForSchool(transaction, {
        schoolId: parsed.schoolId,
        actorUserId: parsed.actorUserId,
        action: "timetable.created",
        entityType: "TimetableEntry",
        entityId: entry.id,
        metadata: { weekday: entry.weekday },
      });
      return toTimetableEntryResult(entry);
    });
  });
}

export function updateTimetableEntry(
  input: UpdateTimetableEntryInput,
): Promise<TimetableEntryResult> {
  return executeTenantService(input, async () => {
    const parsed = updateTimetableEntrySchema.parse(input);
    return getPrismaClient().$transaction(async (transaction) => {
      const existing = await requireTimetableEntryForSchool(transaction, parsed);
      const teacherId = parsed.teacherId ?? existing.teacherId;
      const classroomId = parsed.classroomId ?? existing.classroomId;
      const subjectId = parsed.subjectId ?? existing.subjectId;
      const weekday = parsed.weekday ?? existing.weekday;
      const startTime = parsed.startTime
        ? clockStringToDate(parsed.startTime)
        : existing.startTime;
      const endTime = parsed.endTime ? clockStringToDate(parsed.endTime) : existing.endTime;

      if (startTime >= endTime) {
        throw domainError(
          "VALIDATION_ERROR",
          "endTime must be later than startTime.",
        );
      }

      await requireTenantReferencesForSchool(transaction, {
        schoolId: parsed.schoolId,
        teacherId,
        classroomId,
        subjectId,
      });

      if (parsed.isActive ?? existing.isActive) {
        const overlap = await findTimetableOverlapForSchool(transaction, {
          schoolId: parsed.schoolId,
          termId: existing.termId,
          teacherId,
          classroomId,
          weekday,
          startTime,
          endTime,
          excludeTimetableEntryId: existing.id,
        });
        if (overlap) throwOverlap(overlap, teacherId);
      }

      const entry = await updateTimetableEntryForSchool(transaction, {
        schoolId: parsed.schoolId,
        timetableEntryId: existing.id,
        data: {
          teacherId,
          classroomId,
          subjectId,
          weekday,
          startTime,
          endTime,
          ...(parsed.room !== undefined ? { room: parsed.room } : {}),
          ...(parsed.isActive !== undefined ? { isActive: parsed.isActive } : {}),
        },
      });
      await createAuditLogForSchool(transaction, {
        schoolId: parsed.schoolId,
        actorUserId: parsed.actorUserId,
        action: "timetable.updated",
        entityType: "TimetableEntry",
        entityId: entry.id,
        metadata: { fields: Object.keys(parsed).filter((key) => !["schoolId", "actorUserId"].includes(key)) },
      });
      return toTimetableEntryResult(entry);
    });
  });
}

export function listTimetableEntries(
  input: TenantServiceInput & {
    termId?: string;
    teacherId?: string;
    classroomId?: string;
  },
): Promise<TimetableEntryResult[]> {
  return executeTenantService(input, async () => {
    const entries = await listTimetableEntriesForSchool(getPrismaClient(), input);
    return entries.map(toTimetableEntryResult);
  });
}
