import type { Prisma, PrismaClient, Subject } from "../generated/prisma/client.js";
import {
  requireRecordId,
  requireSchoolId,
  rethrowScopedMutationError,
  TenantRecordNotFoundError,
  type TenantScope,
} from "../tenant.js";

type SubjectClient = Pick<PrismaClient, "subject">;

export function listSubjectsForSchool(
  client: SubjectClient,
  input: TenantScope & { isActive?: boolean; take?: number },
): Promise<Subject[]> {
  const schoolId = requireSchoolId(input);
  const take = Math.min(Math.max(input.take ?? 200, 1), 200);
  return client.subject.findMany({
    where: {
      schoolId,
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
    },
    orderBy: [{ name: "asc" }, { code: "asc" }, { id: "asc" }],
    take,
  });
}

export async function requireSubjectForSchool(
  client: SubjectClient,
  input: TenantScope & { subjectId: string },
): Promise<Subject> {
  const schoolId = requireSchoolId(input);
  const subjectId = requireRecordId(input.subjectId, "subjectId");
  const subject = await client.subject.findUnique({ where: { id: subjectId, schoolId } });
  if (!subject) throw new TenantRecordNotFoundError("Subject");
  return subject;
}

export function createSubjectForSchool(
  client: SubjectClient,
  input: TenantScope & Pick<Prisma.SubjectCreateManyInput, "code" | "name" | "isActive">,
): Promise<Subject> {
  const schoolId = requireSchoolId(input);
  return client.subject.create({
    data: { schoolId, code: input.code, name: input.name, isActive: input.isActive },
  });
}

export async function updateSubjectForSchool(
  client: SubjectClient,
  input: TenantScope & {
    subjectId: string;
    data: Pick<Prisma.SubjectUpdateInput, "code" | "name" | "isActive">;
  },
): Promise<Subject> {
  const schoolId = requireSchoolId(input);
  const subjectId = requireRecordId(input.subjectId, "subjectId");
  try {
    return await client.subject.update({
      where: { id: subjectId, schoolId },
      data: input.data,
    });
  } catch (error) {
    rethrowScopedMutationError(error, "Subject");
  }
}
