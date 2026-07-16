import type {
  AcademicYear,
  ClassSession,
  Classroom,
  PrismaClient,
  SessionStatus,
  Subject,
  Teacher,
  TeachingAssignment,
  Term,
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
type SessionDetailsClient = Pick<
  PrismaClient,
  | "classSession"
  | "classEnrollment"
  | "teachingAssignment"
  | "teacher"
  | "classroom"
  | "subject"
  | "term"
  | "academicYear"
  | "attendanceRecord"
>;
type SessionWriteClient = Pick<
  PrismaClient,
  | "classSession"
  | "timetableEntry"
  | "term"
  | "teacher"
  | "classroom"
  | "subject"
>;

export type ClassSessionWithDetails = ClassSession & {
  teachingAssignment: TeachingAssignment & {
    teacher: Teacher;
    classroom: Classroom;
    subject: Subject;
    term: Term & { academicYear: AcademicYear };
  };
  _count: { attendanceRecords: number };
  enrolledStudentCount: number;
};

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

export function findLiveSessionForTeacherForSchool(
  client: SessionReadClient,
  input: TenantScope & { teacherId: string; excludeSessionId?: string },
) {
  const schoolId = requireSchoolId(input);
  return client.classSession.findFirst({
    where: {
      schoolId,
      teacherId: input.teacherId,
      status: "live",
      ...(input.excludeSessionId ? { id: { not: input.excludeSessionId } } : {}),
    },
    select: { id: true },
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

export async function requireClassSessionDetailsForSchool(
  client: SessionDetailsClient,
  input: TenantScope & { sessionId: string },
): Promise<ClassSessionWithDetails> {
  const schoolId = requireSchoolId(input);
  const sessionId = requireRecordId(input.sessionId, "sessionId");
  const session = await client.classSession.findUnique({
    where: { id: sessionId, schoolId },
  });
  if (!session) throw new TenantRecordNotFoundError("ClassSession");
  const assignment = await client.teachingAssignment.findUnique({
    where: { id: session.teachingAssignmentId, schoolId },
  });
  if (!assignment) throw new TenantRecordNotFoundError("TeachingAssignment");
  const teacher = await client.teacher.findUnique({
    where: { id: assignment.teacherId, schoolId },
  });
  const classroom = await client.classroom.findUnique({
    where: { id: assignment.classroomId, schoolId },
  });
  const subject = await client.subject.findUnique({
    where: { id: assignment.subjectId, schoolId },
  });
  const term = await client.term.findUnique({
    where: { id: assignment.termId, schoolId },
  });
  if (!teacher || !classroom || !subject || !term) {
    throw new TenantRecordNotFoundError("TeachingAssignment");
  }
  const academicYear = await client.academicYear.findUnique({
    where: { id: term.academicYearId, schoolId },
  });
  if (!academicYear) throw new TenantRecordNotFoundError("AcademicYear");
  const enrolledStudentCount = await client.classEnrollment.count({
    where: {
      schoolId,
      termId: session.termId,
      classroomId: session.classroomId,
      isActive: true,
      leftAt: null,
    },
  });
  const attendanceRecordedCount = await client.attendanceRecord.count({
    where: { schoolId, classSessionId: session.id },
  });
  return {
    ...session,
    teachingAssignment: {
      ...assignment,
      teacher,
      classroom,
      subject,
      term: { ...term, academicYear },
    },
    _count: { attendanceRecords: attendanceRecordedCount },
    enrolledStudentCount,
  };
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
        teachingAssignmentId: true,
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
        teachingAssignmentId: timetableEntry.teachingAssignmentId,
        teacherId: timetableEntry.teacherId,
        classroomId: timetableEntry.classroomId,
        subjectId: timetableEntry.subjectId,
        scheduledStart: input.scheduledStart,
        scheduledEnd: input.scheduledEnd,
        notes: input.notes,
      },
    });
}

export function findMaterializedSessionForSchool(
  client: SessionReadClient,
  input: TenantScope & { timetableEntryId: string; scheduledStart: Date },
) {
  const schoolId = requireSchoolId(input);
  return client.classSession.findUnique({
    where: {
      timetableEntryId_scheduledStart: {
        timetableEntryId: requireRecordId(input.timetableEntryId, "timetableEntryId"),
        scheduledStart: input.scheduledStart,
      },
      schoolId,
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
    expectedUpdatedAt?: Date;
  },
): Promise<ClassSession | null> {
  const schoolId = requireSchoolId(input);
  const sessionId = requireRecordId(input.sessionId, "sessionId");
  const update = await client.classSession.updateMany({
    where: {
      id: sessionId,
      schoolId,
      status: input.fromStatus,
      ...(input.expectedUpdatedAt ? { updatedAt: input.expectedUpdatedAt } : {}),
    },
    data: {
      status: input.toStatus,
      ...(input.toStatus === "live" ? { startedAt: input.occurredAt } : {}),
      ...(input.toStatus === "completed" ? { endedAt: input.occurredAt } : {}),
    },
  });

  if (update.count === 0) return null;
  return requireClassSessionForSchool(client, { schoolId, sessionId });
}

export async function cancelClassSessionForSchool(
  client: SessionReadClient,
  input: TenantScope & {
    sessionId: string;
    fromStatus: "scheduled" | "live";
    occurredAt: Date;
    reason: string;
    actorUserId?: string | null;
    expectedUpdatedAt?: Date;
  },
): Promise<ClassSession | null> {
  const schoolId = requireSchoolId(input);
  const sessionId = requireRecordId(input.sessionId, "sessionId");
  const update = await client.classSession.updateMany({
    where: {
      id: sessionId,
      schoolId,
      status: input.fromStatus,
      ...(input.expectedUpdatedAt ? { updatedAt: input.expectedUpdatedAt } : {}),
    },
    data: {
      status: "cancelled",
      cancelledAt: input.occurredAt,
      cancelledById: input.actorUserId ?? null,
      cancellationReason: input.reason,
      ...(input.fromStatus === "live" ? { endedAt: input.occurredAt } : {}),
    },
  });
  if (update.count === 0) return null;
  return requireClassSessionForSchool(client, { schoolId, sessionId });
}
