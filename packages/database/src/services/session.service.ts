import type {
  ClassSessionResult,
  CreateClassSessionInput,
  EndClassSessionInput,
  StartClassSessionInput,
  TenantServiceInput,
} from "@classroom-os/types";
import { z } from "zod";

import { getPrismaClient } from "../client.js";
import { domainError } from "../domain-errors.js";
import { createAuditLogForSchool } from "../repositories/audit.repository.js";
import {
  createSessionFromTimetableInScopeForSchool,
  requireClassSessionForSchool,
  transitionClassSessionForSchool,
} from "../repositories/session.repository.js";
import {
  createClassSessionSchema,
  endClassSessionSchema,
  startClassSessionSchema,
} from "../validation.js";
import { executeTenantService, toClassSessionResult } from "./service-utils.js";

const sessionIdSchema = z.object({
  schoolId: z.string().uuid(),
  sessionId: z.string().uuid(),
});

export function createClassSession(
  input: CreateClassSessionInput,
): Promise<ClassSessionResult> {
  return executeTenantService(input, async () => {
    const parsed = createClassSessionSchema.parse(input);
    return getPrismaClient().$transaction(async (transaction) => {
      const session = await createSessionFromTimetableInScopeForSchool(transaction, {
        schoolId: parsed.schoolId,
        timetableEntryId: parsed.timetableEntryId,
        scheduledStart: new Date(parsed.scheduledStart),
        scheduledEnd: new Date(parsed.scheduledEnd),
        notes: parsed.notes ?? undefined,
      });
      await createAuditLogForSchool(transaction, {
        schoolId: parsed.schoolId,
        actorUserId: parsed.actorUserId,
        action: "session.created",
        entityType: "ClassSession",
        entityId: session.id,
        metadata: { timetableEntryId: parsed.timetableEntryId },
      });
      return toClassSessionResult(session);
    });
  });
}

export function startClassSession(
  input: StartClassSessionInput,
): Promise<ClassSessionResult> {
  return executeTenantService(input, async () => {
    const parsed = startClassSessionSchema.parse(input);
    return getPrismaClient().$transaction(async (transaction) => {
      const current = await requireClassSessionForSchool(transaction, parsed);
      if (current.status !== "scheduled") {
        throw domainError(
          "INVALID_STATE_TRANSITION",
          "Only a scheduled class session can be started.",
          { currentStatus: current.status, requestedStatus: "live" },
        );
      }
      const session = await transitionClassSessionForSchool(transaction, {
        schoolId: parsed.schoolId,
        sessionId: parsed.sessionId,
        fromStatus: "scheduled",
        toStatus: "live",
        occurredAt: parsed.startedAt ? new Date(parsed.startedAt) : new Date(),
      });
      if (!session) {
        throw domainError(
          "INVALID_STATE_TRANSITION",
          "The class session state changed before it could be started.",
        );
      }
      await createAuditLogForSchool(transaction, {
        schoolId: parsed.schoolId,
        actorUserId: parsed.actorUserId,
        action: "session.started",
        entityType: "ClassSession",
        entityId: session.id,
        metadata: { from: "scheduled", to: "live" },
      });
      return toClassSessionResult(session);
    });
  });
}

export function endClassSession(input: EndClassSessionInput): Promise<ClassSessionResult> {
  return executeTenantService(input, async () => {
    const parsed = endClassSessionSchema.parse(input);
    return getPrismaClient().$transaction(async (transaction) => {
      const current = await requireClassSessionForSchool(transaction, parsed);
      if (current.status !== "live") {
        throw domainError(
          "INVALID_STATE_TRANSITION",
          "Only a live class session can be ended.",
          { currentStatus: current.status, requestedStatus: "completed" },
        );
      }
      const session = await transitionClassSessionForSchool(transaction, {
        schoolId: parsed.schoolId,
        sessionId: parsed.sessionId,
        fromStatus: "live",
        toStatus: "completed",
        occurredAt: parsed.endedAt ? new Date(parsed.endedAt) : new Date(),
      });
      if (!session) {
        throw domainError(
          "INVALID_STATE_TRANSITION",
          "The class session state changed before it could be ended.",
        );
      }
      await createAuditLogForSchool(transaction, {
        schoolId: parsed.schoolId,
        actorUserId: parsed.actorUserId,
        action: "session.ended",
        entityType: "ClassSession",
        entityId: session.id,
        metadata: { from: "live", to: "completed" },
      });
      return toClassSessionResult(session);
    });
  });
}

export function getClassSession(
  input: TenantServiceInput & { sessionId: string },
): Promise<ClassSessionResult> {
  return executeTenantService(input, async () => {
    const parsed = sessionIdSchema.parse(input);
    const session = await requireClassSessionForSchool(getPrismaClient(), parsed);
    return toClassSessionResult(session);
  });
}
