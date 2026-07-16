import type { Prisma, PrismaClient } from "../generated/prisma/client.js";
import { requireSchoolId, type TenantScope } from "../tenant.js";

const reportSessionInclude = {
  classroom: { select: { id: true, name: true } },
  subject: { select: { id: true, name: true } },
  teacher: { select: { id: true, firstName: true, lastName: true } },
  attendanceRecords: {
    include: {
      student: {
        select: {
          id: true,
          studentNumber: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { student: { studentNumber: "asc" } },
  },
} satisfies Prisma.ClassSessionInclude;

export type AttendanceReportSession = Prisma.ClassSessionGetPayload<{
  include: typeof reportSessionInclude;
}>;

export type AttendanceReportEnrollment = Prisma.ClassEnrollmentGetPayload<{
  include: {
    student: {
      select: {
        id: true;
        studentNumber: true;
        firstName: true;
        lastName: true;
      };
    };
  };
}>;

type ReportClient = Pick<PrismaClient, "classSession" | "classEnrollment">;

export async function listAttendanceReportDataForSchool(
  client: ReportClient,
  input: TenantScope & {
    termId: string;
    from: Date;
    toExclusive: Date;
    classroomId?: string;
    subjectId?: string;
    teacherId?: string;
    studentId?: string;
  },
): Promise<{
  sessions: AttendanceReportSession[];
  enrollments: AttendanceReportEnrollment[];
}> {
  const schoolId = requireSchoolId(input);
  const studentEnrollments = input.studentId
    ? await client.classEnrollment.findMany({
        where: {
          schoolId,
          termId: input.termId,
          studentId: input.studentId,
          isActive: true,
          leftAt: null,
        },
        select: { classroomId: true },
      })
    : [];
  const studentClassroomIds = studentEnrollments.map(({ classroomId }) => classroomId);
  const sessions = await client.classSession.findMany({
    where: {
      schoolId,
      termId: input.termId,
      scheduledStart: { gte: input.from, lt: input.toExclusive },
      ...(input.classroomId
        ? { classroomId: input.classroomId }
        : input.studentId
          ? { classroomId: { in: studentClassroomIds } }
          : {}),
      ...(input.subjectId ? { subjectId: input.subjectId } : {}),
      ...(input.teacherId ? { teacherId: input.teacherId } : {}),
    },
    include: reportSessionInclude,
    orderBy: [{ scheduledStart: "desc" }, { id: "asc" }],
  });

  const classroomIds = [...new Set(sessions.map(({ classroomId }) => classroomId))];
  const enrollments = classroomIds.length
    ? await client.classEnrollment.findMany({
        where: {
          schoolId,
          termId: input.termId,
          classroomId: { in: classroomIds },
          isActive: true,
          leftAt: null,
          ...(input.studentId ? { studentId: input.studentId } : {}),
        },
        include: {
          student: {
            select: {
              id: true,
              studentNumber: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: [{ classroomId: "asc" }, { student: { studentNumber: "asc" } }],
      })
    : [];

  return { sessions, enrollments };
}
