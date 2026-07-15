import type {
  Classroom,
  Prisma,
  PrismaClient,
} from "../generated/prisma/client.js";
import {
  requireRecordId,
  requireSchoolId,
  rethrowScopedMutationError,
  TenantRecordNotFoundError,
  type TenantScope,
} from "../tenant.js";

type ClassroomClient = Pick<PrismaClient, "classroom">;

export type CreateClassroomInput = TenantScope &
  Pick<Prisma.ClassroomCreateManyInput, "code" | "name" | "gradeLevel" | "isActive">;

export type ListClassroomsInput = TenantScope & {
  gradeLevel?: string;
  isActive?: boolean;
  take?: number;
};

export type UpdateClassroomInput = TenantScope & {
  classroomId: string;
  data: Pick<
    Prisma.ClassroomUpdateManyMutationInput,
    "name" | "gradeLevel" | "isActive"
  >;
};

export async function createClassroomForSchool(
  client: ClassroomClient,
  input: CreateClassroomInput,
): Promise<Classroom> {
  const schoolId = requireSchoolId(input);
  const { code, name, gradeLevel, isActive } = input;

  return client.classroom.create({
    data: { schoolId, code, name, gradeLevel, isActive },
  });
}

export async function listClassroomsForSchool(
  client: ClassroomClient,
  input: ListClassroomsInput,
): Promise<Classroom[]> {
  const schoolId = requireSchoolId(input);
  const take = Math.min(Math.max(input.take ?? 100, 1), 200);

  return client.classroom.findMany({
    where: {
      schoolId,
      ...(input.gradeLevel ? { gradeLevel: input.gradeLevel } : {}),
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
    },
    orderBy: [{ gradeLevel: "asc" }, { name: "asc" }, { id: "asc" }],
    take,
  });
}

export async function requireClassroomForSchool(
  client: ClassroomClient,
  input: TenantScope & { classroomId: string },
): Promise<Classroom> {
  const schoolId = requireSchoolId(input);
  const classroomId = requireRecordId(input.classroomId, "classroomId");
  const classroom = await client.classroom.findUnique({
    where: { id: classroomId, schoolId },
  });

  if (!classroom) throw new TenantRecordNotFoundError("Classroom");

  return classroom;
}

export async function updateClassroomForSchool(
  client: ClassroomClient,
  input: UpdateClassroomInput,
): Promise<Classroom> {
  const schoolId = requireSchoolId(input);
  const classroomId = requireRecordId(input.classroomId, "classroomId");

  try {
    return await client.classroom.update({
      where: { id: classroomId, schoolId },
      data: input.data,
    });
  } catch (error) {
    rethrowScopedMutationError(error, "Classroom");
  }
}
