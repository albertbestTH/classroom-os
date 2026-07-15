import type {
  ClassSession,
  PrismaClient,
  SessionStatus,
} from "../generated/prisma/client.js";
import {
  RepositoryValidationError,
  requireRecordId,
  requireSchoolId,
  rethrowScopedMutationError,
  TenantRecordNotFoundError,
  type TenantScope,
} from "../tenant.js";

type SessionReadClient = Pick<PrismaClient, "classSession">;
type SessionWriteClient = Pick<
  PrismaClient,
  "classSession" | "timetableEntry" | "term" | "teacher" | "classroom" | "subject"
>;

export type ListClassSessionsInput = TenantScope & {
  classroomId?: string;
  teacherId?: string;
  startsAtOrAfter?: Date;
  startsBefore?: Date;
  take?: number;
};

export type CreateSessionFromTimetableInput = TenantScope & {
  timetableEntryId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  notes?: string;
};

export async function listClassSessionsForSchool(
  client: SessionReadClient,
  input: ListClassSessionsInput,
): Promise<ClassSession[]> {
  const schoolId = requireSchoolId(input);
  const take = Math.min(Math.max(input.take ?? 100, 1), 200);

  return client.classSession.findMany({
    where: {
      schoolId,
      ...(input.classroomId ? { classroomId: input.classroomId } : {}),
      ...(input.teacherId ? { teacherId: input.teacherId } : {}),
      ...(input.startsAtOrAfter || input.startsBefore
        ? {
            scheduledStart: {
              ...(input.startsAtOrAfter ? { gte: input.startsAtOrAfter } : {}),
              ...(input.startsBefore ? { lt: input.startsBefore } : {}),
            },
          }
        : {}),
    },
    orderBy: [{ scheduledStart: "asc" }, { id: "asc" }],
    take,
  });
}

export async function requireClassSessionForSchool(
  client: SessionReadClient,
  input: TenantScope & { sessionId: string },
): Promise<ClassSession> {
  const schoolId = requireSchoolId(input);
  const sessionId = requireRecordId(input.sessionId, "sessionId");
  const session = await client.classSession.findUnique({
    where: { id: sessionId, schoolId },
  });

  if (!session) throw new TenantRecordNotFoundError("ClassSession");

  return session;
}

export async function createSessionFromTimetableForSchool(
  client: PrismaClient,
  input: CreateSessionFromTimetableInput,
): Promise<ClassSession> {
  return client.$transaction((transaction) =>
    createSessionFromTimetableInScopeForSchool(transaction, input),
  );
}

export async function createSessionFromTimetableInScopeForSchool(
  client: SessionWriteClient,
  input: CreateSessionFromTimetableInput,
): Promise<ClassSession> {
  const schoolId = requireSchoolId(input);
  const timetableEntryId = requireRecordId(
    input.timetableEntryId,
    "timetableEntryId",
  );

  if (
    Number.isNaN(input.scheduledStart.getTime()) ||
    Number.isNaN(input.scheduledEnd.getTime()) ||
    input.scheduledEnd <= input.scheduledStart
  ) {
    throw new RepositoryValidationError(
      "scheduledEnd must be later than a valid scheduledStart.",
    );
  }

  const timetableEntry = await client.timetableEntry.findUnique({
      where: { id: timetableEntryId, schoolId, isActive: true },
      select: {
        id: true,
        termId: true,
        teacherId: true,
        classroomId: true,
        subjectId: true,
      },
    });

    if (!timetableEntry) {
      throw new TenantRecordNotFoundError("TimetableEntry");
    }

    const term = await client.term.findUnique({
      where: { id: timetableEntry.termId, schoolId },
      select: { id: true },
    });
    const teacher = await client.teacher.findUnique({
      where: { id: timetableEntry.teacherId, schoolId },
      select: { id: true },
    });
    const classroom = await client.classroom.findUnique({
      where: { id: timetableEntry.classroomId, schoolId },
      select: { id: true },
    });
    const subject = await client.subject.findUnique({
      where: { id: timetableEntry.subjectId, schoolId },
      select: { id: true },
    });

    if (!term || !teacher || !classroom || !subject) {
      throw new TenantRecordNotFoundError("TimetableEntry");
    }

    return client.classSession.create({
      data: {
        schoolId,
        termId: timetableEntry.termId,
        timetableEntryId: timetableEntry.id,
        teacherId: timetableEntry.teacherId,
        classroomId: timetableEntry.classroomId,
        subjectId: timetableEntry.subjectId,
        scheduledStart: input.scheduledStart,
        scheduledEnd: input.scheduledEnd,
        notes: input.notes,
      },
    });
}

export async function updateClassSessionStatusForSchool(
  client: SessionReadClient,
  input: TenantScope & { sessionId: string; status: SessionStatus },
): Promise<ClassSession> {
  const schoolId = requireSchoolId(input);
  const sessionId = requireRecordId(input.sessionId, "sessionId");

  try {
    return await client.classSession.update({
      where: { id: sessionId, schoolId },
      data: { status: input.status },
    });
  } catch (error) {
    rethrowScopedMutationError(error, "ClassSession");
  }
}

export async function transitionClassSessionForSchool(
  client: SessionReadClient,
  input: TenantScope & {
    sessionId: string;
    fromStatus: SessionStatus;
    toStatus: SessionStatus;
    occurredAt: Date;
  },
): Promise<ClassSession | null> {
  const schoolId = requireSchoolId(input);
  const sessionId = requireRecordId(input.sessionId, "sessionId");
  const update = await client.classSession.updateMany({
    where: { id: sessionId, schoolId, status: input.fromStatus },
    data: {
      status: input.toStatus,
      ...(input.toStatus === "live" ? { startedAt: input.occurredAt } : {}),
      ...(input.toStatus === "completed" ? { endedAt: input.occurredAt } : {}),
    },
  });

  if (update.count === 0) return null;
  return requireClassSessionForSchool(client, { schoolId, sessionId });
}
