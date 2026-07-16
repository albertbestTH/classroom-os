import type { PrismaClient } from "../generated/prisma/client.js";
import {
  requireRecordId,
  requireSchoolId,
  TenantRecordNotFoundError,
  type TenantScope,
} from "../tenant.js";

type AccountClient = Pick<
  PrismaClient,
  "user" | "teacher" | "teachingAssignment" | "authSession"
>;

export function listStaffUsersForSchool(client: AccountClient, scope: TenantScope) {
  const schoolId = requireSchoolId(scope);
  return client.user.findMany({
    where: { schoolId },
    include: {
      teacherProfile: {
        select: {
          id: true,
          employeeCode: true,
          isActive: true,
          _count: { select: { teachingAssignments: true } },
        },
      },
    },
    orderBy: [{ role: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
  });
}

export async function requireStaffUserForSchool(
  client: AccountClient,
  input: TenantScope & { userId: string },
) {
  const schoolId = requireSchoolId(input);
  const userId = requireRecordId(input.userId, "userId");
  const user = await client.user.findUnique({
    where: { id: userId, schoolId },
    include: {
      teacherProfile: {
        include: { _count: { select: { teachingAssignments: true } } },
      },
    },
  });
  if (!user) throw new TenantRecordNotFoundError("Staff user");
  return user;
}

export function createStaffUserForSchool(
  client: AccountClient,
  input: TenantScope & {
    email: string;
    firstName: string;
    lastName: string;
    role: "SCHOOL_OWNER" | "ADMIN" | "TEACHER";
    passwordHash: string;
  },
) {
  const schoolId = requireSchoolId(input);
  return client.user.create({
    data: {
      schoolId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      status: "ACTIVE",
      passwordHash: input.passwordHash,
    },
    include: {
      teacherProfile: {
        select: {
          id: true,
          employeeCode: true,
          isActive: true,
          _count: { select: { teachingAssignments: true } },
        },
      },
    },
  });
}

export async function setStaffStatusForSchool(
  client: AccountClient,
  input: TenantScope & { userId: string; status: "ACTIVE" | "DISABLED" },
) {
  const schoolId = requireSchoolId(input);
  const userId = requireRecordId(input.userId, "userId");
  const user = await client.user.update({
    where: { id: userId, schoolId },
    data: { status: input.status },
    include: {
      teacherProfile: {
        select: {
          id: true,
          employeeCode: true,
          isActive: true,
          _count: { select: { teachingAssignments: true } },
        },
      },
    },
  });
  if (input.status === "DISABLED") {
    await client.authSession.updateMany({
      where: { schoolId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  return user;
}

export function assignTeacherProfileForSchool(
  client: AccountClient,
  input: TenantScope & {
    userId: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
  },
) {
  const schoolId = requireSchoolId(input);
  return client.teacher.upsert({
    where: { userId: input.userId },
    update: {
      employeeCode: input.employeeCode,
      firstName: input.firstName,
      lastName: input.lastName,
      isActive: true,
    },
    create: {
      schoolId,
      userId: input.userId,
      employeeCode: input.employeeCode,
      firstName: input.firstName,
      lastName: input.lastName,
    },
  });
}

export function createTeachingAssignmentForSchool(
  client: AccountClient,
  input: TenantScope & {
    termId: string;
    teacherId: string;
    classroomId: string;
    subjectId: string;
  },
) {
  const schoolId = requireSchoolId(input);
  return client.teachingAssignment.create({
    data: {
      schoolId,
      termId: input.termId,
      teacherId: input.teacherId,
      classroomId: input.classroomId,
      subjectId: input.subjectId,
    },
    include: {
      teacher: { select: { userId: true, firstName: true, lastName: true } },
      classroom: { select: { name: true } },
      subject: { select: { code: true, name: true } },
      term: {
        select: { name: true, academicYear: { select: { id: true, name: true } } },
      },
    },
  });
}

export function listTeachingAssignmentsForSchool(
  client: AccountClient,
  input: TenantScope & { userId?: string },
) {
  const schoolId = requireSchoolId(input);
  return client.teachingAssignment.findMany({
    where: {
      schoolId,
      ...(input.userId ? { teacher: { userId: input.userId } } : {}),
    },
    include: {
      teacher: { select: { userId: true, firstName: true, lastName: true } },
      classroom: { select: { name: true } },
      subject: { select: { code: true, name: true } },
      term: {
        select: { name: true, academicYear: { select: { id: true, name: true } } },
      },
    },
    orderBy: [
      { term: { startsOn: "desc" } },
      { classroom: { name: "asc" } },
      { subject: { name: "asc" } },
    ],
  });
}

export async function requireTeachingAssignmentForSchool(
  client: AccountClient,
  input: TenantScope & { teachingAssignmentId: string },
) {
  const schoolId = requireSchoolId(input);
  const id = requireRecordId(input.teachingAssignmentId, "teachingAssignmentId");
  const assignment = await client.teachingAssignment.findUnique({
    where: { id, schoolId },
    include: {
      teacher: { select: { userId: true, firstName: true, lastName: true } },
      classroom: { select: { name: true } },
      subject: { select: { code: true, name: true } },
      term: {
        select: { name: true, academicYear: { select: { id: true, name: true } } },
      },
    },
  });
  if (!assignment) throw new TenantRecordNotFoundError("Teaching assignment");
  return assignment;
}
