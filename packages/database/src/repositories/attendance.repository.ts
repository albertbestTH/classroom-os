import type {
  AttendanceCorrection,
  AttendanceRecord,
  AttendanceStatus,
  ClassSession,
  Prisma,
  PrismaClient,
} from "../generated/prisma/client.js";
import {
  requireRecordId,
  requireSchoolId,
  TenantRecordNotFoundError,
  type TenantScope,
} from "../tenant.js";

type AttendanceClient = Pick<
  PrismaClient,
  | "classSession"
  | "classEnrollment"
  | "attendanceRecord"
  | "user"
>;
type CorrectionClient = AttendanceClient & Pick<PrismaClient, "attendanceCorrection">;

export type AttendanceSession = Pick<
  ClassSession,
  "id" | "schoolId" | "termId" | "classroomId" | "status" | "updatedAt"
>;

const correctionWithActor = {
  actor: { select: { firstName: true, lastName: true } },
} satisfies Prisma.AttendanceCorrectionInclude;

export type AttendanceCorrectionWithActor = Prisma.AttendanceCorrectionGetPayload<{
  include: typeof correctionWithActor;
}>;

export async function requireAttendanceSessionForSchool(
  client: AttendanceClient,
  input: TenantScope & { sessionId: string },
): Promise<AttendanceSession> {
  const schoolId = requireSchoolId(input);
  const id = requireRecordId(input.sessionId, "sessionId");
  const session = await client.classSession.findUnique({
    where: { id, schoolId },
    select: {
      id: true,
      schoolId: true,
      termId: true,
      classroomId: true,
      status: true,
      updatedAt: true,
    },
  });

  if (!session) throw new TenantRecordNotFoundError("ClassSession");
  return session;
}

export async function findUnenrolledStudentIdsForSchool(
  client: AttendanceClient,
  input: TenantScope & {
    termId: string;
    classroomId: string;
    studentIds: readonly string[];
  },
): Promise<string[]> {
  const schoolId = requireSchoolId(input);
  const enrollments = await client.classEnrollment.findMany({
    where: {
      schoolId,
      termId: input.termId,
      classroomId: input.classroomId,
      studentId: { in: [...input.studentIds] },
      isActive: true,
      leftAt: null,
    },
    select: { studentId: true },
  });
  const enrolledIds = new Set(enrollments.map(({ studentId }) => studentId));
  return input.studentIds.filter((studentId) => !enrolledIds.has(studentId));
}

export async function upsertAttendanceBatchForSchool(
  client: AttendanceClient,
  input: TenantScope & {
    sessionId: string;
    actorUserId?: string | null;
    records: ReadonlyArray<{
      studentId: string;
      status: AttendanceStatus;
      note?: string | null;
    }>;
  },
): Promise<AttendanceRecord[]> {
  const schoolId = requireSchoolId(input);
  const classSessionId = requireRecordId(input.sessionId, "sessionId");
  const recordedAt = new Date();

  const records: AttendanceRecord[] = [];
  for (const { studentId, status, note } of input.records) {
    records.push(
      await client.attendanceRecord.upsert({
        where: { classSessionId_studentId: { classSessionId, studentId } },
        create: {
          schoolId,
          classSessionId,
          studentId,
          recordedById: input.actorUserId ?? null,
          status,
          note: note ?? null,
          recordedAt,
        },
        update: {
          recordedById: input.actorUserId ?? null,
          status,
          note: note ?? null,
          recordedAt,
        },
      }),
    );
  }
  return records;
}

export async function listAttendanceForSessionForSchool(
  client: AttendanceClient,
  input: TenantScope & { sessionId: string },
): Promise<AttendanceRecord[]> {
  const schoolId = requireSchoolId(input);
  const classSessionId = requireRecordId(input.sessionId, "sessionId");
  await requireAttendanceSessionForSchool(client, input);
  return client.attendanceRecord.findMany({
    where: { schoolId, classSessionId },
    orderBy: [{ studentId: "asc" }],
  });
}

export async function listAttendanceRosterForSchool(
  client: CorrectionClient,
  input: TenantScope & { sessionId: string },
) {
  const schoolId = requireSchoolId(input);
  const session = await requireAttendanceSessionForSchool(client, input);
  const enrollments = await client.classEnrollment.findMany({
      where: {
        schoolId,
        termId: session.termId,
        classroomId: session.classroomId,
        isActive: true,
        leftAt: null,
        student: { isActive: true },
      },
      include: { student: true },
      orderBy: [{ student: { studentNumber: "asc" } }],
    });
  const records = await client.attendanceRecord.findMany({
      where: { schoolId, classSessionId: session.id },
      include: { corrections: { include: correctionWithActor, orderBy: { createdAt: "desc" } } },
    });
  return { session, enrollments, records };
}

export async function requireAttendanceRecordForCorrectionForSchool(
  client: CorrectionClient,
  input: TenantScope & { sessionId: string; studentId: string },
): Promise<AttendanceRecord> {
  const schoolId = requireSchoolId(input);
  const record = await client.attendanceRecord.findUnique({
    where: {
      classSessionId_studentId: {
        classSessionId: requireRecordId(input.sessionId, "sessionId"),
        studentId: requireRecordId(input.studentId, "studentId"),
      },
      schoolId,
    },
  });
  if (!record) throw new TenantRecordNotFoundError("AttendanceRecord");
  return record;
}

export async function updateAttendanceRecordAfterCorrectionForSchool(
  client: CorrectionClient,
  input: TenantScope & {
    attendanceRecordId: string;
    expectedUpdatedAt: Date;
    actorUserId?: string | null;
    status: AttendanceStatus;
    note?: string | null;
  },
): Promise<AttendanceRecord | null> {
  const schoolId = requireSchoolId(input);
  const result = await client.attendanceRecord.updateMany({
    where: {
      id: requireRecordId(input.attendanceRecordId, "attendanceRecordId"),
      schoolId,
      updatedAt: input.expectedUpdatedAt,
    },
    data: {
      status: input.status,
      note: input.note ?? null,
      recordedById: input.actorUserId ?? null,
      recordedAt: new Date(),
    },
  });
  if (result.count === 0) return null;
  return client.attendanceRecord.findUnique({
    where: { id: input.attendanceRecordId, schoolId },
  });
}

export function createAttendanceCorrectionForSchool(
  client: CorrectionClient,
  input: TenantScope & Omit<AttendanceCorrection, "id" | "schoolId" | "createdAt">,
): Promise<AttendanceCorrectionWithActor> {
  const schoolId = requireSchoolId(input);
  return client.attendanceCorrection.create({
    data: {
      schoolId,
      attendanceRecordId: input.attendanceRecordId,
      classSessionId: input.classSessionId,
      studentId: input.studentId,
      actorUserId: input.actorUserId,
      beforeStatus: input.beforeStatus,
      afterStatus: input.afterStatus,
      beforeNote: input.beforeNote,
      afterNote: input.afterNote,
      reason: input.reason,
    },
    include: correctionWithActor,
  });
}
