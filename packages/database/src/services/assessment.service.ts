import type {
  AssessmentResult,
  BatchServiceResult,
  CreateAssessmentInput,
  CreateScoreCategoryInput,
  GradebookResult,
  ScoreResult,
  ScoreCategoryResult,
  UpdateAssessmentInput,
  UpdateScoreCategoryInput,
  UpdateScoreBatchInput,
} from "@classroom-os/types";
import { z } from "zod";

import { getPrismaClient } from "../client.js";
import { domainError } from "../domain-errors.js";
import { Prisma } from "../generated/prisma/client.js";
import {
  createAssessmentForSchool,
  createScoreCategoryForSchool,
  deleteAssessmentForSchool,
  deleteScoreCategoryForSchool,
  findUnenrolledScoreStudentIdsForSchool,
  getGradebookDataForSchool,
  requireAssessmentForSchool,
  requireScoreCategoryForSchool,
  updateAssessmentForSchool,
  updateScoreCategoryForSchool,
  upsertScoreCategoryForSchool,
  upsertScoreBatchForSchool,
} from "../repositories/assessment.repository.js";
import { createAuditLogForSchool } from "../repositories/audit.repository.js";
import { requireTenantReferencesForSchool } from "../repositories/reference.repository.js";
import { requireTeachingAssignmentForSchool } from "../repositories/account.repository.js";
import { requireClassSessionForSchool } from "../repositories/session.repository.js";
import {
  createAssessmentSchema,
  createScoreCategorySchema,
  updateAssessmentSchema,
  updateScoreBatchSchema,
  updateScoreCategorySchema,
} from "../validation.js";
import {
  executeTenantService,
  toAssessmentResult,
  toScoreResult,
} from "./service-utils.js";

const gradebookSchema = z.object({
  schoolId: z.string().uuid(),
  teachingAssignmentId: z.string().uuid(),
});

export function getGradebook(input: {
  schoolId: string;
  teachingAssignmentId: string;
}): Promise<GradebookResult> {
  return executeTenantService(input, async () => {
    const parsed = gradebookSchema.parse(input);
    const { assignment, categories, assessments, enrollments } = await getGradebookDataForSchool(
      getPrismaClient(),
      parsed,
    );
    const assessmentResults = assessments.map((assessment) => ({
      ...toAssessmentResult(assessment),
      scoreCount: assessment.scores.length,
    }));
    return {
      teachingContext: {
        academicYearId: assignment.term.academicYear.id,
        academicYearName: assignment.term.academicYear.name,
        termId: assignment.termId,
        termName: assignment.term.name,
        teachingAssignmentId: assignment.id,
        teacherId: assignment.teacherId,
        teacherName: `${assignment.teacher.firstName} ${assignment.teacher.lastName}`,
        classroomId: assignment.classroomId,
        classroomName: assignment.classroom.name,
        subjectId: assignment.subjectId,
        subjectName: assignment.subject.name,
      },
      categories: categories.map(toScoreCategoryResult),
      assessments: assessmentResults,
      students: enrollments.map(({ student }) => {
        const scores = assessments.map((assessment) => {
          const score = assessment.scores.find((item) => item.studentId === student.id);
          return {
            assessmentId: assessment.id,
            value: score?.value.toNumber() ?? null,
            feedback: score?.feedback ?? null,
            gradedAt: score?.gradedAt.toISOString() ?? null,
          };
        });
        return {
          studentId: student.id,
          studentNumber: student.studentNumber,
          firstName: student.firstName,
          lastName: student.lastName,
          preferredName: student.preferredName,
          profileImageKey: student.profileImageKey,
          scores,
        };
      }),
    };
  });
}

function toScoreCategoryResult(category: {
  id: string; schoolId: string; termId: string; teachingAssignmentId: string; name: string;
}): ScoreCategoryResult {
  return { ...category };
}

export function createScoreCategory(input: CreateScoreCategoryInput): Promise<ScoreCategoryResult> {
  return executeTenantService(input, async () => {
    const parsed = createScoreCategorySchema.parse(input);
    return getPrismaClient().$transaction(async (transaction) => {
      await transaction.$executeRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${parsed.schoolId}), hashtext(${parsed.teachingAssignmentId}))`,
      );
      const assignment = await requireTeachingAssignmentForSchool(transaction, parsed);
      if (assignment.termId !== parsed.termId) {
        throw domainError("TENANT_ACCESS_DENIED", "The category term does not match the teaching assignment.");
      }
      const category = await createScoreCategoryForSchool(transaction, parsed);
      await createAuditLogForSchool(transaction, {
        schoolId: parsed.schoolId, actorUserId: parsed.actorUserId,
        action: "score_category.created", entityType: "ScoreCategory", entityId: category.id,
        metadata: { teachingAssignmentId: category.teachingAssignmentId },
      });
      return toScoreCategoryResult(category);
    });
  });
}

export function getOrCreateDefaultScoreCategory(input: CreateScoreCategoryInput): Promise<ScoreCategoryResult> {
  return executeTenantService(input, async () => {
    const parsed = createScoreCategorySchema.parse(input);
    return getPrismaClient().$transaction(async (transaction) => {
      await transaction.$executeRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${parsed.schoolId}), hashtext(${parsed.teachingAssignmentId}))`,
      );
      const assignment = await requireTeachingAssignmentForSchool(transaction, parsed);
      if (assignment.termId !== parsed.termId) {
        throw domainError("TENANT_ACCESS_DENIED", "The category term does not match the teaching assignment.");
      }
      return toScoreCategoryResult(await upsertScoreCategoryForSchool(transaction, parsed));
    });
  });
}

export function updateScoreCategory(input: UpdateScoreCategoryInput): Promise<ScoreCategoryResult> {
  return executeTenantService(input, async () => {
    const parsed = updateScoreCategorySchema.parse(input);
    return getPrismaClient().$transaction(async (transaction) => {
      const existing = await requireScoreCategoryForSchool(transaction, parsed);
      const category = await updateScoreCategoryForSchool(transaction, parsed);
      await createAuditLogForSchool(transaction, {
        schoolId: parsed.schoolId, actorUserId: parsed.actorUserId,
        action: "score_category.updated", entityType: "ScoreCategory", entityId: category.id,
        metadata: { beforeName: existing.name, afterName: category.name },
      });
      return toScoreCategoryResult(category);
    });
  });
}

export function deleteScoreCategory(input: { schoolId: string; actorUserId?: string; categoryId: string }): Promise<ScoreCategoryResult> {
  return executeTenantService(input, async () => {
    const parsed = z.object({ schoolId: z.string().uuid(), actorUserId: z.string().uuid().optional(), categoryId: z.string().uuid() }).parse(input);
    return getPrismaClient().$transaction(async (transaction) => {
      const category = await requireScoreCategoryForSchool(transaction, parsed);
      const used = await transaction.assessment.count({ where: { schoolId: parsed.schoolId, categoryId: parsed.categoryId } });
      if (used > 0) throw domainError("CONFLICT", "A category used by assessments cannot be deleted.");
      await deleteScoreCategoryForSchool(transaction, parsed);
      await createAuditLogForSchool(transaction, {
        schoolId: parsed.schoolId, actorUserId: parsed.actorUserId,
        action: "score_category.deleted", entityType: "ScoreCategory", entityId: category.id,
        metadata: { teachingAssignmentId: category.teachingAssignmentId },
      });
      return toScoreCategoryResult(category);
    });
  });
}

export function createAssessment(
  input: CreateAssessmentInput,
): Promise<AssessmentResult> {
  return executeTenantService(input, async () => {
    const parsed = createAssessmentSchema.parse(input);
    return getPrismaClient().$transaction(async (transaction) => {
      if (parsed.classSessionId) {
        // Serialize deterministic Quick Assessment resolution for one tenant/session.
        // The second concurrent caller waits, then observes and returns the row
        // created by the first caller instead of creating a duplicate.
        await transaction.$executeRaw(
          Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${parsed.schoolId}), hashtext(${parsed.classSessionId}))`,
        );
        const session = await requireClassSessionForSchool(transaction, {
          schoolId: parsed.schoolId,
          sessionId: parsed.classSessionId,
        });
        if (session.status === "cancelled") {
          throw domainError(
            "INVALID_STATE_TRANSITION",
            "A cancelled session cannot receive scores.",
            { currentStatus: session.status },
          );
        }
        const existing = await transaction.assessment.findFirst({
          where: { schoolId: parsed.schoolId, classSessionId: parsed.classSessionId },
        });
        if (existing) return toAssessmentResult(existing);
      }

      const assignment = await requireTeachingAssignmentForSchool(transaction, parsed);
      if (
        assignment.termId !== parsed.termId || assignment.classroomId !== parsed.classroomId ||
        assignment.subjectId !== parsed.subjectId || assignment.teacherId !== parsed.teacherId
      ) throw domainError("TENANT_ACCESS_DENIED", "The assessment context does not match its teaching assignment.");
      const category = await requireScoreCategoryForSchool(transaction, parsed);
      if (category.teachingAssignmentId !== parsed.teachingAssignmentId || category.termId !== parsed.termId) {
        throw domainError("TENANT_ACCESS_DENIED", "The assessment category does not match its teaching assignment.");
      }

      const assessment = await createAssessmentForSchool(transaction, {
        schoolId: parsed.schoolId,
        data: {
          termId: parsed.termId,
          classroomId: parsed.classroomId,
          subjectId: parsed.subjectId,
          teacherId: parsed.teacherId,
          teachingAssignmentId: parsed.teachingAssignmentId,
          categoryId: parsed.categoryId,
          classSessionId: parsed.classSessionId ?? null,
          title: parsed.title,
          type: parsed.type,
          maxScore: new Prisma.Decimal(parsed.maxScore),
          assessmentDate: new Date(`${parsed.assessmentDate}T00:00:00.000Z`),
          dueAt: parsed.dueAt ? new Date(parsed.dueAt) : null,
        },
      });
      await createAuditLogForSchool(transaction, {
        schoolId: parsed.schoolId,
        actorUserId: parsed.actorUserId,
        action: "assessment.created",
        entityType: "Assessment",
        entityId: assessment.id,
        metadata: { type: assessment.type, maxScore: parsed.maxScore },
      });
      return toAssessmentResult(assessment);
    });
  });
}

export function updateAssessment(input: UpdateAssessmentInput): Promise<AssessmentResult> {
  return executeTenantService(input, async () => {
    const parsed = updateAssessmentSchema.parse(input);
    return getPrismaClient().$transaction(async (transaction) => {
      const existing = await requireAssessmentForSchool(transaction, parsed);
      if (parsed.categoryId) {
        const category = await requireScoreCategoryForSchool(transaction, { ...parsed, categoryId: parsed.categoryId });
        if (category.teachingAssignmentId !== existing.teachingAssignmentId) {
          throw domainError("TENANT_ACCESS_DENIED", "The category does not match the assessment teaching assignment.");
        }
      }
      if (parsed.maxScore !== undefined) {
        const maximumRecorded = await transaction.score.aggregate({
          where: { schoolId: parsed.schoolId, assessmentId: parsed.assessmentId },
          _max: { value: true },
        });
        if (maximumRecorded._max.value?.greaterThan(parsed.maxScore)) {
          throw domainError("CONFLICT", "The maximum score cannot be lower than an existing score.");
        }
      }
      const assessment = await updateAssessmentForSchool(transaction, {
        ...parsed,
        data: {
          ...(parsed.title !== undefined ? { title: parsed.title } : {}),
          ...(parsed.categoryId !== undefined ? { categoryId: parsed.categoryId } : {}),
          ...(parsed.maxScore !== undefined ? { maxScore: new Prisma.Decimal(parsed.maxScore) } : {}),
          ...(parsed.assessmentDate !== undefined ? { assessmentDate: new Date(`${parsed.assessmentDate}T00:00:00.000Z`) } : {}),
        },
      });
      await createAuditLogForSchool(transaction, {
        schoolId: parsed.schoolId, actorUserId: parsed.actorUserId,
        action: "assessment.updated", entityType: "Assessment", entityId: assessment.id,
        metadata: { fields: Object.keys(parsed).filter((key) => !["schoolId", "actorUserId", "assessmentId"].includes(key)) },
      });
      return toAssessmentResult(assessment);
    });
  });
}

export function deleteAssessment(input: { schoolId: string; actorUserId?: string; assessmentId: string }): Promise<AssessmentResult> {
  return executeTenantService(input, async () => {
    const parsed = z.object({ schoolId: z.string().uuid(), actorUserId: z.string().uuid().optional(), assessmentId: z.string().uuid() }).parse(input);
    return getPrismaClient().$transaction(async (transaction) => {
      const existing = await requireAssessmentForSchool(transaction, parsed);
      await deleteAssessmentForSchool(transaction, parsed);
      await createAuditLogForSchool(transaction, {
        schoolId: parsed.schoolId, actorUserId: parsed.actorUserId,
        action: "assessment.deleted", entityType: "Assessment", entityId: existing.id,
        metadata: { teachingAssignmentId: existing.teachingAssignmentId },
      });
      return toAssessmentResult(existing);
    });
  });
}

export function updateScoreBatch(
  input: UpdateScoreBatchInput,
): Promise<BatchServiceResult<ScoreResult>> {
  return executeTenantService(input, async () => {
    const parsed = updateScoreBatchSchema.parse(input);
    return getPrismaClient().$transaction(async (transaction) => {
      const assessment = await requireAssessmentForSchool(transaction, parsed);
      if (assessment.classSessionId) {
        const session = await requireClassSessionForSchool(transaction, {
          schoolId: parsed.schoolId,
          sessionId: assessment.classSessionId,
        });
        if (session.status === "cancelled") {
          throw domainError(
            "INVALID_STATE_TRANSITION",
            "Scores cannot be edited for a cancelled session.",
            { currentStatus: session.status },
          );
        }
      }

      if (parsed.gradedById) {
        await requireTenantReferencesForSchool(transaction, {
          schoolId: parsed.schoolId,
          teacherId: parsed.gradedById,
        });
      }

      const maxScore = assessment.maxScore.toNumber();
      const aboveMaximum = parsed.scores.filter(({ value }) => value !== null && value > maxScore);
      if (aboveMaximum.length > 0) {
        throw domainError(
          "VALIDATION_ERROR",
          "A score cannot exceed the assessment maximum.",
          { studentIds: aboveMaximum.map(({ studentId }) => studentId), maxScore },
        );
      }

      const studentIds = parsed.scores.map(({ studentId }) => studentId);
      const unenrolled = await findUnenrolledScoreStudentIdsForSchool(transaction, {
        schoolId: parsed.schoolId,
        assessment,
        studentIds,
      });
      if (unenrolled.length > 0) {
        throw domainError(
          "VALIDATION_ERROR",
          "Scores can only be recorded for enrolled students.",
          { studentIds: unenrolled },
        );
      }

      const scores = await upsertScoreBatchForSchool(transaction, {
        schoolId: parsed.schoolId,
        assessmentId: assessment.id,
        gradedById: parsed.gradedById,
        scores: parsed.scores.map((score) => ({
          ...score,
          value: score.value === null ? null : new Prisma.Decimal(score.value),
        })),
      });
      await createAuditLogForSchool(transaction, {
        schoolId: parsed.schoolId,
        actorUserId: parsed.actorUserId,
        action: "score.batch_updated",
        entityType: "Assessment",
        entityId: assessment.id,
        metadata: { count: scores.length },
      });
      const results = scores.map(toScoreResult);
      return { count: results.length, records: results };
    });
  });
}
