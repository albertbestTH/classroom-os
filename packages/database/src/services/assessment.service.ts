import type {
  AssessmentResult,
  BatchServiceResult,
  CreateAssessmentInput,
  GradebookResult,
  ScoreResult,
  UpdateScoreBatchInput,
} from "@classroom-os/types";
import { z } from "zod";

import { getPrismaClient } from "../client.js";
import { domainError } from "../domain-errors.js";
import { Prisma } from "../generated/prisma/client.js";
import {
  createAssessmentForSchool,
  findUnenrolledScoreStudentIdsForSchool,
  getGradebookDataForSchool,
  requireAssessmentForSchool,
  upsertScoreBatchForSchool,
} from "../repositories/assessment.repository.js";
import { createAuditLogForSchool } from "../repositories/audit.repository.js";
import { requireTenantReferencesForSchool } from "../repositories/reference.repository.js";
import { requireClassSessionForSchool } from "../repositories/session.repository.js";
import { createAssessmentSchema, updateScoreBatchSchema } from "../validation.js";
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
    const { assignment, assessments, enrollments } = await getGradebookDataForSchool(
      getPrismaClient(),
      parsed,
    );
    const assessmentResults = assessments.map((assessment) => ({
      ...toAssessmentResult(assessment),
      scoreCount: assessment.scores.length,
    }));
    const totalMaxScore = assessmentResults.reduce(
      (total, assessment) => total + assessment.maxScore,
      0,
    );
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
        const earnedScore = scores.reduce((total, score) => total + (score.value ?? 0), 0);
        const gradedMaxScore = scores.reduce((total, score, index) =>
          total + (score.value === null ? 0 : (assessmentResults[index]?.maxScore ?? 0)), 0);
        return {
          studentId: student.id,
          studentNumber: student.studentNumber,
          firstName: student.firstName,
          lastName: student.lastName,
          preferredName: student.preferredName,
          profileImageKey: student.profileImageKey,
          scores,
          earnedScore,
          gradedMaxScore,
          percentage: gradedMaxScore > 0
            ? Math.round((earnedScore / gradedMaxScore) * 10_000) / 100
            : null,
        };
      }),
      totalMaxScore,
    };
  });
}

export function createAssessment(
  input: CreateAssessmentInput,
): Promise<AssessmentResult> {
  return executeTenantService(input, async () => {
    const parsed = createAssessmentSchema.parse(input);
    return getPrismaClient().$transaction(async (transaction) => {
      if (parsed.classSessionId) {
        const session = await requireClassSessionForSchool(transaction, {
          schoolId: parsed.schoolId,
          sessionId: parsed.classSessionId,
        });
        if (session.status === "completed" || session.status === "cancelled") {
          throw domainError(
            "INVALID_STATE_TRANSITION",
            "A completed or cancelled session cannot be edited.",
            { currentStatus: session.status },
          );
        }
      }

      const assessment = await createAssessmentForSchool(transaction, {
        schoolId: parsed.schoolId,
        data: {
          termId: parsed.termId,
          classroomId: parsed.classroomId,
          subjectId: parsed.subjectId,
          teacherId: parsed.teacherId,
          classSessionId: parsed.classSessionId ?? null,
          title: parsed.title,
          type: parsed.type,
          maxScore: new Prisma.Decimal(parsed.maxScore),
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
        if (session.status === "completed" || session.status === "cancelled") {
          throw domainError(
            "INVALID_STATE_TRANSITION",
            "Scores cannot be edited for a completed or cancelled session.",
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
      const aboveMaximum = parsed.scores.filter(({ value }) => value > maxScore);
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
          value: new Prisma.Decimal(score.value),
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
