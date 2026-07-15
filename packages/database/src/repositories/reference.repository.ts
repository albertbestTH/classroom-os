import type { PrismaClient } from "../generated/prisma/client.js";
import {
  requireRecordId,
  requireSchoolId,
  TenantRecordNotFoundError,
  type TenantScope,
} from "../tenant.js";

type ReferenceClient = Pick<
  PrismaClient,
  "term" | "teacher" | "classroom" | "subject" | "user"
>;

export type TenantReferenceInput = TenantScope & {
  termId?: string;
  teacherId?: string;
  classroomId?: string;
  subjectId?: string;
  userId?: string;
};

export async function requireTenantReferencesForSchool(
  client: ReferenceClient,
  input: TenantReferenceInput,
): Promise<void> {
  const schoolId = requireSchoolId(input);

  if (input.termId !== undefined) {
    const id = requireRecordId(input.termId, "termId");
    const record = await client.term.findUnique({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!record) throw new TenantRecordNotFoundError("Term");
  }
  if (input.teacherId !== undefined) {
    const id = requireRecordId(input.teacherId, "teacherId");
    const record = await client.teacher.findUnique({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!record) throw new TenantRecordNotFoundError("Teacher");
  }
  if (input.classroomId !== undefined) {
    const id = requireRecordId(input.classroomId, "classroomId");
    const record = await client.classroom.findUnique({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!record) throw new TenantRecordNotFoundError("Classroom");
  }
  if (input.subjectId !== undefined) {
    const id = requireRecordId(input.subjectId, "subjectId");
    const record = await client.subject.findUnique({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!record) throw new TenantRecordNotFoundError("Subject");
  }
  if (input.userId !== undefined) {
    const id = requireRecordId(input.userId, "userId");
    const record = await client.user.findUnique({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!record) throw new TenantRecordNotFoundError("User");
  }
}
