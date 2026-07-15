import type {
  Prisma,
  PrismaClient,
  TimetableEntry,
} from "../generated/prisma/client.js";
import {
  requireRecordId,
  requireSchoolId,
  rethrowScopedMutationError,
  TenantRecordNotFoundError,
  type TenantScope,
} from "../tenant.js";
import { requireTenantReferencesForSchool } from "./reference.repository.js";

type TimetableClient = Pick<
  PrismaClient,
  "timetableEntry" | "term" | "teacher" | "classroom" | "subject" | "user"
>;

export type TimetableWriteData = Pick<
  Prisma.TimetableEntryCreateManyInput,
  | "termId"
  | "teacherId"
  | "classroomId"
  | "subjectId"
  | "weekday"
  | "startTime"
  | "endTime"
  | "room"
  | "isActive"
>;

export async function requireTimetableEntryForSchool(
  client: TimetableClient,
  input: TenantScope & { timetableEntryId: string },
): Promise<TimetableEntry> {
  const schoolId = requireSchoolId(input);
  const id = requireRecordId(input.timetableEntryId, "timetableEntryId");
  const entry = await client.timetableEntry.findUnique({ where: { id, schoolId } });

  if (!entry) throw new TenantRecordNotFoundError("TimetableEntry");
  return entry;
}

export async function listTimetableEntriesForSchool(
  client: TimetableClient,
  input: TenantScope & { termId?: string; teacherId?: string; classroomId?: string },
): Promise<TimetableEntry[]> {
  const schoolId = requireSchoolId(input);
  return client.timetableEntry.findMany({
    where: {
      schoolId,
      ...(input.termId ? { termId: input.termId } : {}),
      ...(input.teacherId ? { teacherId: input.teacherId } : {}),
      ...(input.classroomId ? { classroomId: input.classroomId } : {}),
    },
    orderBy: [{ weekday: "asc" }, { startTime: "asc" }, { id: "asc" }],
  });
}

export async function findTimetableOverlapForSchool(
  client: TimetableClient,
  input: TenantScope & {
    termId: string;
    teacherId: string;
    classroomId: string;
    weekday: number;
    startTime: Date;
    endTime: Date;
    excludeTimetableEntryId?: string;
  },
): Promise<Pick<TimetableEntry, "id" | "teacherId" | "classroomId"> | null> {
  const schoolId = requireSchoolId(input);
  return client.timetableEntry.findFirst({
    where: {
      schoolId,
      termId: input.termId,
      weekday: input.weekday,
      isActive: true,
      startTime: { lt: input.endTime },
      endTime: { gt: input.startTime },
      OR: [{ teacherId: input.teacherId }, { classroomId: input.classroomId }],
      ...(input.excludeTimetableEntryId
        ? { id: { not: input.excludeTimetableEntryId } }
        : {}),
    },
    select: { id: true, teacherId: true, classroomId: true },
  });
}

export async function createTimetableEntryForSchool(
  client: TimetableClient,
  input: TenantScope & { data: TimetableWriteData },
): Promise<TimetableEntry> {
  const schoolId = requireSchoolId(input);
  await requireTenantReferencesForSchool(client, {
    schoolId,
    termId: input.data.termId,
    teacherId: input.data.teacherId,
    classroomId: input.data.classroomId,
    subjectId: input.data.subjectId,
  });

  return client.timetableEntry.create({ data: { schoolId, ...input.data } });
}

export async function updateTimetableEntryForSchool(
  client: TimetableClient,
  input: TenantScope & {
    timetableEntryId: string;
    data: Prisma.TimetableEntryUncheckedUpdateInput;
  },
): Promise<TimetableEntry> {
  const schoolId = requireSchoolId(input);
  const id = requireRecordId(input.timetableEntryId, "timetableEntryId");

  try {
    return await client.timetableEntry.update({ where: { id, schoolId }, data: input.data });
  } catch (error) {
    rethrowScopedMutationError(error, "TimetableEntry");
  }
}
