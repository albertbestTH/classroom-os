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
  | "timetableEntry"
  | "teachingAssignment"
  | "term"
  | "teacher"
  | "classroom"
  | "subject"
  | "user"
>;

const timetableDetails = {
  teachingAssignment: {
    include: {
      teacher: true,
      classroom: true,
      subject: true,
      term: { include: { academicYear: true } },
    },
  },
} satisfies Prisma.TimetableEntryInclude;

export type TimetableEntryWithDetails = Prisma.TimetableEntryGetPayload<{
  include: typeof timetableDetails;
}>;

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

export async function requireTimetableEntryDetailsForSchool(
  client: TimetableClient,
  input: TenantScope & { timetableEntryId: string },
): Promise<TimetableEntryWithDetails> {
  const schoolId = requireSchoolId(input);
  const id = requireRecordId(input.timetableEntryId, "timetableEntryId");
  const entry = await client.timetableEntry.findUnique({
    where: { id, schoolId },
    include: timetableDetails,
  });
  if (!entry) throw new TenantRecordNotFoundError("TimetableEntry");
  return entry;
}

export async function listTimetableEntriesForSchool(
  client: TimetableClient,
  input: TenantScope & {
    termId?: string;
    teacherId?: string;
    classroomId?: string;
    subjectId?: string;
  },
): Promise<TimetableEntryWithDetails[]> {
  const schoolId = requireSchoolId(input);
  return client.timetableEntry.findMany({
    where: {
      schoolId,
      ...(input.termId ? { termId: input.termId } : {}),
      ...(input.teacherId ? { teacherId: input.teacherId } : {}),
      ...(input.classroomId ? { classroomId: input.classroomId } : {}),
      ...(input.subjectId ? { subjectId: input.subjectId } : {}),
    },
    include: timetableDetails,
    orderBy: [{ weekday: "asc" }, { startTime: "asc" }, { id: "asc" }],
  });
}

export async function requireMatchingTeachingAssignmentForSchool(
  client: TimetableClient,
  input: TenantScope & {
    termId: string;
    teacherId: string;
    classroomId: string;
    subjectId: string;
  },
): Promise<{ id: string }> {
  const schoolId = requireSchoolId(input);
  const assignment = await client.teachingAssignment.findUnique({
    where: {
      schoolId_termId_teacherId_classroomId_subjectId: {
        schoolId,
        termId: input.termId,
        teacherId: input.teacherId,
        classroomId: input.classroomId,
        subjectId: input.subjectId,
      },
    },
    select: { id: true },
  });
  if (!assignment) throw new TenantRecordNotFoundError("TeachingAssignment");
  return assignment;
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
  const assignment = await requireMatchingTeachingAssignmentForSchool(client, {
    schoolId,
    termId: input.data.termId,
    teacherId: input.data.teacherId,
    classroomId: input.data.classroomId,
    subjectId: input.data.subjectId,
  });

  return client.timetableEntry.create({
    data: { schoolId, teachingAssignmentId: assignment.id, ...input.data },
  });
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
