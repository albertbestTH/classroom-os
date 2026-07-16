import type {
  ClassSessionResult,
  CancelClassSessionInput,
  CreateClassSessionInput,
  EndClassSessionInput,
  MaterializeClassSessionInput,
  SessionTimelineEventResult,
  StartClassSessionInput,
  TenantServiceInput,
  TrustedAuthContext,
} from "@classroom-os/types";
import { z } from "zod";

import { getPrismaClient } from "../client.js";
import { requireRole, requireSchoolAccess } from "../auth/authorization.js";
import { domainError } from "../domain-errors.js";
import { requireTermForSchool } from "../repositories/academic-calendar.repository.js";
import { createAuditLogForSchool } from "../repositories/audit.repository.js";
import { requireSchoolSettingsForSchool } from "../repositories/reference.repository.js";
import {
  cancelClassSessionForSchool,
  createSessionFromTimetableInScopeForSchool,
  findMaterializedSessionForSchool,
  findLiveSessionForTeacherForSchool,
  requireClassSessionDetailsForSchool,
  requireClassSessionForSchool,
  transitionClassSessionForSchool,
} from "../repositories/session.repository.js";
import {
  createSessionTimelineEventForSchool,
  listSessionTimelineForSchool,
} from "../repositories/session-timeline.repository.js";
import { requireTimetableEntryDetailsForSchool } from "../repositories/timetable.repository.js";
import {
  cancelClassSessionSchema,
  createClassSessionSchema,
  endClassSessionSchema,
  startClassSessionSchema,
} from "../validation.js";
import { executeTenantService, toClassSessionResult } from "./service-utils.js";
import { isoWeekday, localDateForInstant, localDateTimeToInstant } from "./timezone.js";

const sessionIdSchema = z.object({
  schoolId: z.string().uuid(),
  sessionId: z.string().uuid(),
});

const materializeSchema = z.object({
  schoolId: z.string().uuid(),
  actorUserId: z.string().uuid().nullable().optional(),
  timetableEntryId: z.string().uuid(),
  localDate: z.string().date(),
});

function clock(value: Date): string {
  return `${String(value.getUTCHours()).padStart(2, "0")}:${String(
    value.getUTCMinutes(),
  ).padStart(2, "0")}`;
}

export function createClassSession(
  input: CreateClassSessionInput,
): Promise<ClassSessionResult> {
  return executeTenantService(input, async () => {
    const parsed = createClassSessionSchema.parse(input);
    const prisma = getPrismaClient();
    const entry = await requireTimetableEntryDetailsForSchool(prisma, parsed);
    const school = await requireSchoolSettingsForSchool(prisma, parsed);
    const localDate = localDateForInstant(new Date(parsed.scheduledStart), school.timezone);
    const expectedStart = localDateTimeToInstant(localDate, clock(entry.startTime), school.timezone);
    const expectedEnd = localDateTimeToInstant(localDate, clock(entry.endTime), school.timezone);
    if (
      expectedStart.toISOString() !== new Date(parsed.scheduledStart).toISOString() ||
      expectedEnd.toISOString() !== new Date(parsed.scheduledEnd).toISOString()
    ) {
      throw domainError(
        "VALIDATION_ERROR",
        "Session times must match the timetable entry in the school timezone.",
      );
    }
    return materializeClassSession({
      schoolId: parsed.schoolId,
      actorUserId: parsed.actorUserId,
      timetableEntryId: parsed.timetableEntryId,
      localDate,
    });
  });
}

export function materializeClassSession(
  input: MaterializeClassSessionInput,
): Promise<ClassSessionResult> {
  return executeTenantService(input, async () => {
    const parsed = materializeSchema.parse(input);
    const prisma = getPrismaClient();
    const sessionId = await prisma.$transaction(async (transaction) => {
      const entry = await requireTimetableEntryDetailsForSchool(transaction, parsed);
      const school = await requireSchoolSettingsForSchool(transaction, parsed);
      if (!entry.isActive || entry.weekday !== isoWeekday(parsed.localDate)) {
        throw domainError(
          "VALIDATION_ERROR",
          "The timetable entry is not scheduled on this local date.",
        );
      }
      const term = await requireTermForSchool(transaction, {
        schoolId: parsed.schoolId,
        termId: entry.termId,
      });
      const startsOn = term.startsOn.toISOString().slice(0, 10);
      const endsOn = term.endsOn.toISOString().slice(0, 10);
      if (parsed.localDate < startsOn || parsed.localDate > endsOn) {
        throw domainError("VALIDATION_ERROR", "The class date is outside the term.");
      }
      const scheduledStart = localDateTimeToInstant(
        parsed.localDate,
        clock(entry.startTime),
        school.timezone,
      );
      const existing = await findMaterializedSessionForSchool(transaction, {
        schoolId: parsed.schoolId,
        timetableEntryId: entry.id,
        scheduledStart,
      });
      if (existing) {
        return existing.id;
      }
      const session = await createSessionFromTimetableInScopeForSchool(transaction, {
        schoolId: parsed.schoolId,
        timetableEntryId: entry.id,
        scheduledStart,
        scheduledEnd: localDateTimeToInstant(
          parsed.localDate,
          clock(entry.endTime),
          school.timezone,
        ),
      });
      await createAuditLogForSchool(transaction, {
        schoolId: parsed.schoolId,
        actorUserId: parsed.actorUserId,
        action: "session.materialized",
        entityType: "ClassSession",
        entityId: session.id,
        metadata: {
          timetableEntryId: entry.id,
          teachingAssignmentId: entry.teachingAssignmentId,
          localDate: parsed.localDate,
        },
      });
      return session.id;
    });
    return toClassSessionResult(
      await requireClassSessionDetailsForSchool(prisma, {
        schoolId: parsed.schoolId,
        sessionId,
      }),
    );
  });
}

export function startClassSession(
  input: StartClassSessionInput,
): Promise<ClassSessionResult> {
  return executeTenantService(input, async () => {
    const parsed = startClassSessionSchema.parse(input);
    const prisma = getPrismaClient();
    const sessionId = await prisma.$transaction(async (transaction) => {
      const current = await requireClassSessionForSchool(transaction, parsed);
      if (current.status === "live") {
        return current.id;
      }
      if (current.status !== "scheduled") {
        throw domainError(
          "INVALID_STATE_TRANSITION",
          "Only a scheduled class session can be started.",
          { currentStatus: current.status, requestedStatus: "live" },
        );
      }
      const overlapping = await findLiveSessionForTeacherForSchool(transaction, {
        schoolId: parsed.schoolId,
        teacherId: current.teacherId,
        excludeSessionId: current.id,
      });
      if (overlapping) {
        throw domainError("CONFLICT", "The teacher already has a live class session.");
      }
      const occurredAt = parsed.startedAt ? new Date(parsed.startedAt) : new Date();
      const session = await transitionClassSessionForSchool(transaction, {
        schoolId: parsed.schoolId,
        sessionId: parsed.sessionId,
        fromStatus: "scheduled",
        toStatus: "live",
        occurredAt,
        expectedUpdatedAt: parsed.expectedUpdatedAt
          ? new Date(parsed.expectedUpdatedAt)
          : undefined,
      });
      if (!session) {
        throw domainError("CONFLICT", "The class session changed. Refresh before retrying.");
      }
      await createSessionTimelineEventForSchool(transaction, {
        schoolId: parsed.schoolId,
        classSessionId: session.id,
        actorUserId: parsed.actorUserId,
        eventType: "SESSION_STARTED",
        metadata: { occurredAt: occurredAt.toISOString() },
      });
      await createAuditLogForSchool(transaction, {
        schoolId: parsed.schoolId,
        actorUserId: parsed.actorUserId,
        action: "session.started",
        entityType: "ClassSession",
        entityId: session.id,
        metadata: { from: "scheduled", to: "live" },
      });
      return session.id;
    });
    return toClassSessionResult(
      await requireClassSessionDetailsForSchool(prisma, {
        schoolId: parsed.schoolId,
        sessionId,
      }),
    );
  });
}

export function endClassSession(input: EndClassSessionInput): Promise<ClassSessionResult> {
  return executeTenantService(input, async () => {
    const parsed = endClassSessionSchema.parse(input);
    const prisma = getPrismaClient();
    const sessionId = await prisma.$transaction(async (transaction) => {
      const current = await requireClassSessionForSchool(transaction, parsed);
      if (current.status === "completed") {
        return current.id;
      }
      if (current.status !== "live") {
        throw domainError(
          "INVALID_STATE_TRANSITION",
          "Only a live class session can be ended.",
          { currentStatus: current.status, requestedStatus: "completed" },
        );
      }
      const occurredAt = parsed.endedAt ? new Date(parsed.endedAt) : new Date();
      const session = await transitionClassSessionForSchool(transaction, {
        schoolId: parsed.schoolId,
        sessionId: parsed.sessionId,
        fromStatus: "live",
        toStatus: "completed",
        occurredAt,
        expectedUpdatedAt: parsed.expectedUpdatedAt
          ? new Date(parsed.expectedUpdatedAt)
          : undefined,
      });
      if (!session) {
        throw domainError("CONFLICT", "The class session changed. Refresh before retrying.");
      }
      await createSessionTimelineEventForSchool(transaction, {
        schoolId: parsed.schoolId,
        classSessionId: session.id,
        actorUserId: parsed.actorUserId,
        eventType: "SESSION_ENDED",
        metadata: { occurredAt: occurredAt.toISOString() },
      });
      await createAuditLogForSchool(transaction, {
        schoolId: parsed.schoolId,
        actorUserId: parsed.actorUserId,
        action: "session.ended",
        entityType: "ClassSession",
        entityId: session.id,
        metadata: { from: "live", to: "completed" },
      });
      return session.id;
    });
    return toClassSessionResult(
      await requireClassSessionDetailsForSchool(prisma, {
        schoolId: parsed.schoolId,
        sessionId,
      }),
    );
  });
}

export function cancelClassSession(
  input: CancelClassSessionInput & { auth: TrustedAuthContext },
): Promise<ClassSessionResult> {
  return executeTenantService(input, async () => {
    const auth = requireSchoolAccess(input.auth, input.schoolId);
    const parsed = cancelClassSessionSchema.parse({
      ...input,
      actorUserId: auth.userId,
    });
    const prisma = getPrismaClient();
    const sessionId = await prisma.$transaction(async (transaction) => {
      const current = await requireClassSessionForSchool(transaction, parsed);
      if (current.status === "cancelled") {
        return current.id;
      }
      if (current.status === "completed") {
        throw domainError(
          "INVALID_STATE_TRANSITION",
          "Completed class sessions cannot be cancelled or reopened.",
        );
      }
      if (current.status === "live") {
        requireRole(auth, ["SCHOOL_OWNER", "ADMIN"]);
      }
      const occurredAt = new Date();
      const session = await cancelClassSessionForSchool(transaction, {
        schoolId: parsed.schoolId,
        sessionId: parsed.sessionId,
        fromStatus: current.status,
        occurredAt,
        reason: parsed.reason,
        actorUserId: auth.userId,
        expectedUpdatedAt: parsed.expectedUpdatedAt
          ? new Date(parsed.expectedUpdatedAt)
          : undefined,
      });
      if (!session) {
        throw domainError("CONFLICT", "The class session changed. Refresh before retrying.");
      }
      await createSessionTimelineEventForSchool(transaction, {
        schoolId: parsed.schoolId,
        classSessionId: session.id,
        actorUserId: auth.userId,
        eventType: "SESSION_CANCELLED",
        metadata: { from: current.status, occurredAt: occurredAt.toISOString() },
      });
      await createAuditLogForSchool(transaction, {
        schoolId: parsed.schoolId,
        actorUserId: auth.userId,
        action: "session.cancelled",
        entityType: "ClassSession",
        entityId: session.id,
        metadata: { from: current.status, to: "cancelled" },
      });
      return session.id;
    });
    return toClassSessionResult(
      await requireClassSessionDetailsForSchool(prisma, {
        schoolId: parsed.schoolId,
        sessionId,
      }),
    );
  });
}

export function getClassSession(
  input: TenantServiceInput & { sessionId: string },
): Promise<ClassSessionResult> {
  return executeTenantService(input, async () => {
    const parsed = sessionIdSchema.parse(input);
    return toClassSessionResult(
      await requireClassSessionDetailsForSchool(getPrismaClient(), parsed),
    );
  });
}

export function listClassSessionTimeline(
  input: TenantServiceInput & { sessionId: string },
): Promise<SessionTimelineEventResult[]> {
  return executeTenantService(input, async () => {
    const parsed = sessionIdSchema.parse(input);
    await requireClassSessionForSchool(getPrismaClient(), parsed);
    const events = await listSessionTimelineForSchool(getPrismaClient(), parsed);
    return events.map((event) => ({
      id: event.id,
      classSessionId: event.classSessionId,
      actorUserId: event.actorUserId,
      eventType: event.eventType,
      metadata:
        event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
          ? (event.metadata as Record<string, unknown>)
          : {},
      createdAt: event.createdAt.toISOString(),
    }));
  });
}
