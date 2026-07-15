import type {
  Assessment,
  Prisma,
  PrismaClient,
  Score,
} from "../generated/prisma/client.js";
import {
  requireRecordId,
  requireSchoolId,
  TenantRecordNotFoundError,
  type TenantScope,
} from "../tenant.js";
import { findUnenrolledStudentIdsForSchool } from "./attendance.repository.js";
import { requireTenantReferencesForSchool } from "./reference.repository.js";

type AssessmentClient = Pick<
  PrismaClient,
  | "assessment"
  | "score"
  | "attendanceRecord"
  | "classSession"
  | "classEnrollment"
  | "term"
  | "teacher"
  | "classroom"
  | "subject"
  | "user"
>;

export async function requireAssessmentForSchool(
  client: AssessmentClient,
  input: TenantScope & { assessmentId: string },
): Promise<Assessment> {
  const schoolId = requireSchoolId(input);
  const id = requireRecordId(input.assessmentId, "assessmentId");
  const assessment = await client.assessment.findUnique({ where: { id, schoolId } });

  if (!assessment) throw new TenantRecordNotFoundError("Assessment");
  return assessment;
}

export async function createAssessmentForSchool(
  client: AssessmentClient,
  input: TenantScope & {
    data: Omit<Prisma.AssessmentCreateManyInput, "schoolId">;
  },
): Promise<Assessment> {
  const schoolId = requireSchoolId(input);
  await requireTenantReferencesForSchool(client, {
    schoolId,
    termId: input.data.termId,
    teacherId: input.data.teacherId,
    classroomId: input.data.classroomId,
    subjectId: input.data.subjectId,
  });

  if (input.data.classSessionId) {
    const session = await client.classSession.findUnique({
      where: { id: input.data.classSessionId, schoolId },
      select: {
        id: true,
        termId: true,
        classroomId: true,
        subjectId: true,
        teacherId: true,
        status: true,
      },
    });
    if (!session) throw new TenantRecordNotFoundError("ClassSession");
    if (
      session.termId !== input.data.termId ||
      session.classroomId !== input.data.classroomId ||
      session.subjectId !== input.data.subjectId ||
      session.teacherId !== input.data.teacherId
    ) {
      throw new TenantRecordNotFoundError("ClassSession");
    }
  }

  return client.assessment.create({ data: { schoolId, ...input.data } });
}

export async function findUnenrolledScoreStudentIdsForSchool(
  client: AssessmentClient,
  input: TenantScope & {
    assessment: Pick<Assessment, "termId" | "classroomId">;
    studentIds: readonly string[];
  },
): Promise<string[]> {
  return findUnenrolledStudentIdsForSchool(client, {
    schoolId: input.schoolId,
    termId: input.assessment.termId,
    classroomId: input.assessment.classroomId,
    studentIds: input.studentIds,
  });
}

export async function upsertScoreBatchForSchool(
  client: AssessmentClient,
  input: TenantScope & {
    assessmentId: string;
    gradedById?: string | null;
    scores: ReadonlyArray<{
      studentId: string;
      value: Prisma.Decimal;
      feedback?: string | null;
    }>;
  },
): Promise<Score[]> {
  const schoolId = requireSchoolId(input);
  const assessmentId = requireRecordId(input.assessmentId, "assessmentId");
  const gradedAt = new Date();

  if (input.gradedById) {
    await requireTenantReferencesForSchool(client, {
      schoolId,
      teacherId: input.gradedById,
    });
  }

  const scores: Score[] = [];
  for (const { studentId, value, feedback } of input.scores) {
    scores.push(
      await client.score.upsert({
        where: { assessmentId_studentId: { assessmentId, studentId } },
        create: {
          schoolId,
          assessmentId,
          studentId,
          gradedById: input.gradedById ?? null,
          value,
          feedback: feedback ?? null,
          gradedAt,
        },
        update: {
          gradedById: input.gradedById ?? null,
          value,
          feedback: feedback ?? null,
          gradedAt,
        },
      }),
    );
  }
  return scores;
}
