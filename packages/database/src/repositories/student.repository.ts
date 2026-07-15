import type {
  Prisma,
  PrismaClient,
  Student,
} from "../generated/prisma/client.js";
import {
  requireRecordId,
  requireSchoolId,
  rethrowScopedMutationError,
  TenantRecordNotFoundError,
  type TenantScope,
} from "../tenant.js";

type StudentClient = Pick<PrismaClient, "student">;

export type CreateStudentInput = TenantScope &
  Pick<
    Prisma.StudentCreateManyInput,
    | "studentNumber"
    | "firstName"
    | "lastName"
    | "preferredName"
    | "dateOfBirth"
    | "isActive"
  >;

export type ListStudentsInput = TenantScope & {
  query?: string;
  isActive?: boolean;
  classroomId?: string;
  termId?: string;
  take?: number;
};

export type UpdateStudentInput = TenantScope & {
  studentId: string;
  data: Pick<
    Prisma.StudentUpdateManyMutationInput,
    "firstName" | "lastName" | "preferredName" | "dateOfBirth" | "isActive"
  >;
};

export async function createStudentForSchool(
  client: StudentClient,
  input: CreateStudentInput,
): Promise<Student> {
  const schoolId = requireSchoolId(input);
  const {
    studentNumber,
    firstName,
    lastName,
    preferredName,
    dateOfBirth,
    isActive,
  } = input;

  return client.student.create({
    data: {
      schoolId,
      studentNumber,
      firstName,
      lastName,
      preferredName,
      dateOfBirth,
      isActive,
    },
  });
}

export async function listStudentsForSchool(
  client: StudentClient,
  input: ListStudentsInput,
): Promise<Student[]> {
  const schoolId = requireSchoolId(input);
  const query = input.query?.trim();
  const take = Math.min(Math.max(input.take ?? 100, 1), 200);

  return client.student.findMany({
    where: {
      schoolId,
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      ...(input.classroomId
        ? {
            classEnrollments: {
              some: {
                schoolId,
                classroomId: input.classroomId,
                ...(input.termId ? { termId: input.termId } : {}),
                isActive: true,
              },
            },
          }
        : {}),
      ...(query
        ? {
            OR: [
              { studentNumber: { contains: query, mode: "insensitive" } },
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { preferredName: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
    take,
  });
}

export async function requireStudentForSchool(
  client: StudentClient,
  input: TenantScope & { studentId: string },
): Promise<Student> {
  const schoolId = requireSchoolId(input);
  const studentId = requireRecordId(input.studentId, "studentId");
  const student = await client.student.findUnique({
    where: { id: studentId, schoolId },
  });

  if (!student) throw new TenantRecordNotFoundError("Student");

  return student;
}

export async function updateStudentForSchool(
  client: StudentClient,
  input: UpdateStudentInput,
): Promise<Student> {
  const schoolId = requireSchoolId(input);
  const studentId = requireRecordId(input.studentId, "studentId");

  try {
    return await client.student.update({
      where: { id: studentId, schoolId },
      data: input.data,
    });
  } catch (error) {
    rethrowScopedMutationError(error, "Student");
  }
}
