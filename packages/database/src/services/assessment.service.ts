import type {
  AssessmentResult,
  BatchServiceResult,
  CreateAssessmentInput,
  ScoreResult,
  UpdateScoreBatchInput,
} from "@classroom-os/types";

import { getPrismaClient } from "../client.js";
import { domainError } from "../domain-errors.js";
import { Prisma } from "../generated/prisma/client.js";
import {
  createAssessmentForSchool,
  findUnenrolledScoreStudentIdsForSchool,
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
