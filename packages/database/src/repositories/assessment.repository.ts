import type {
  Assessment,
  Prisma,
  PrismaClient,
  Score,
  ScoreCategory,
} from "../generated/prisma/client.js";
import {
  requireRecordId,
  requireSchoolId,
  TenantRecordNotFoundError,
  type TenantScope,
} from "../tenant.js";
import { findUnenrolledStudentIdsForSchool } from "./attendance.repository.js";
import { requireTeachingAssignmentForSchool } from "./account.repository.js";
import { requireTenantReferencesForSchool } from "./reference.repository.js";

type AssessmentClient = Pick<
  PrismaClient,
  | "assessment"
  | "scoreCategory"
  | "authSession"
  | "score"
  | "attendanceRecord"
  | "classSession"
  | "classEnrollment"
  | "term"
  | "teacher"
  | "teachingAssignment"
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

export async function requireScoreCategoryForSchool(
  client: AssessmentClient,
  input: TenantScope & { categoryId: string },
): Promise<ScoreCategory> {
  const schoolId = requireSchoolId(input);
  const id = requireRecordId(input.categoryId, "categoryId");
  const category = await client.scoreCategory.findUnique({ where: { id, schoolId } });
  if (!category) throw new TenantRecordNotFoundError("Score category");
  return category;
}

export async function getGradebookDataForSchool(
  client: AssessmentClient,
  input: TenantScope & { teachingAssignmentId: string },
) {
  const schoolId = requireSchoolId(input);
  const teachingAssignmentId = requireRecordId(
    input.teachingAssignmentId,
    "teachingAssignmentId",
  );
  const assignment = await requireTeachingAssignmentForSchool(client, {
    schoolId,
    teachingAssignmentId,
  });
  const [categories, assessments, enrollments] = await Promise.all([
    client.scoreCategory.findMany({
      where: { schoolId, teachingAssignmentId },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
    client.assessment.findMany({
      where: {
        schoolId,
        teachingAssignmentId,
      },
      include: { scores: { orderBy: { studentId: "asc" } } },
      orderBy: [{ assessmentDate: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    }),
    client.classEnrollment.findMany({
      where: {
        schoolId,
        termId: assignment.termId,
        classroomId: assignment.classroomId,
        isActive: true,
        leftAt: null,
      },
      include: { student: true },
      orderBy: [
        { student: { lastName: "asc" } },
        { student: { firstName: "asc" } },
        { studentId: "asc" },
      ],
    }),
  ]);
  return { assignment, categories, assessments, enrollments };
}

export function createScoreCategoryForSchool(
  client: AssessmentClient,
  input: TenantScope & { termId: string; teachingAssignmentId: string; name: string },
) {
  const schoolId = requireSchoolId(input);
  return client.scoreCategory.create({
    data: {
      schoolId,
      termId: input.termId,
      teachingAssignmentId: input.teachingAssignmentId,
      name: input.name,
    },
  });
}

export function upsertScoreCategoryForSchool(
  client: AssessmentClient,
  input: TenantScope & { termId: string; teachingAssignmentId: string; name: string },
) {
  const schoolId = requireSchoolId(input);
  return client.scoreCategory.upsert({
    where: {
      schoolId_teachingAssignmentId_name: {
        schoolId,
        teachingAssignmentId: input.teachingAssignmentId,
        name: input.name,
      },
    },
    create: { schoolId, termId: input.termId, teachingAssignmentId: input.teachingAssignmentId, name: input.name },
    update: {},
  });
}

export function updateScoreCategoryForSchool(
  client: AssessmentClient,
  input: TenantScope & { categoryId: string; name: string },
) {
  const schoolId = requireSchoolId(input);
  return client.scoreCategory.update({
    where: { id: requireRecordId(input.categoryId, "categoryId"), schoolId },
    data: { name: input.name },
  });
}

export function deleteScoreCategoryForSchool(
  client: AssessmentClient,
  input: TenantScope & { categoryId: string },
) {
  const schoolId = requireSchoolId(input);
  return client.scoreCategory.delete({
    where: { id: requireRecordId(input.categoryId, "categoryId"), schoolId },
  });
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

export function updateAssessmentForSchool(
  client: AssessmentClient,
  input: TenantScope & {
    assessmentId: string;
    data: Pick<Prisma.AssessmentUpdateInput, "title" | "maxScore" | "assessmentDate"> & {
      categoryId?: string;
    };
  },
) {
  const schoolId = requireSchoolId(input);
  const { categoryId, ...data } = input.data;
  return client.assessment.update({
    where: { id: requireRecordId(input.assessmentId, "assessmentId"), schoolId },
    data: {
      ...data,
      ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
    },
  });
}

export async function deleteAssessmentForSchool(
  client: AssessmentClient,
  input: TenantScope & { assessmentId: string },
) {
  const schoolId = requireSchoolId(input);
  const assessmentId = requireRecordId(input.assessmentId, "assessmentId");
  await client.score.deleteMany({ where: { schoolId, assessmentId } });
  return client.assessment.delete({ where: { id: assessmentId, schoolId } });
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
      value: Prisma.Decimal | null;
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
    if (value === null) {
      await client.score.deleteMany({ where: { schoolId, assessmentId, studentId } });
      continue;
    }
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
