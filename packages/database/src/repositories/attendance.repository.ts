import type {
  AttendanceRecord,
  AttendanceStatus,
  ClassSession,
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
  "classSession" | "classEnrollment" | "attendanceRecord" | "user"
>;

export type AttendanceSession = Pick<
  ClassSession,
  "id" | "schoolId" | "termId" | "classroomId" | "status"
>;

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
