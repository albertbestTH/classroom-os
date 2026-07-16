import type {
  ClassSessionResult,
  CreateClassSessionInput,
  EndClassSessionInput,
  MaterializeClassSessionInput,
  SessionTimelineEventResult,
  StartClassSessionInput,
  TenantServiceInput,
} from "@classroom-os/types";
import { z } from "zod";

import { getPrismaClient } from "../client.js";
import { domainError } from "../domain-errors.js";
import { requireTermForSchool } from "../repositories/academic-calendar.repository.js";
import { createAuditLogForSchool } from "../repositories/audit.repository.js";
import { requireSchoolSettingsForSchool } from "../repositories/reference.repository.js";
import {
  createSessionFromTimetableInScopeForSchool,
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
    return getPrismaClient().$transaction(async (transaction) => {
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
      const session = await createSessionFromTimetableInScopeForSchool(transaction, {
        schoolId: parsed.schoolId,
        timetableEntryId: entry.id,
        scheduledStart: localDateTimeToInstant(
          parsed.localDate,
          clock(entry.startTime),
          school.timezone,
        ),
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
      return toClassSessionResult(
        await requireClassSessionDetailsForSchool(transaction, {
          schoolId: parsed.schoolId,
          sessionId: session.id,
        }),
      );
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
      });
      if (!session) {
        throw domainError(
          "INVALID_STATE_TRANSITION",
          "The class session state changed before it could be started.",
        );
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
      return toClassSessionResult(
        await requireClassSessionDetailsForSchool(transaction, parsed),
      );
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
      const occurredAt = parsed.endedAt ? new Date(parsed.endedAt) : new Date();
      const session = await transitionClassSessionForSchool(transaction, {
        schoolId: parsed.schoolId,
        sessionId: parsed.sessionId,
        fromStatus: "live",
        toStatus: "completed",
        occurredAt,
      });
      if (!session) {
        throw domainError(
          "INVALID_STATE_TRANSITION",
          "The class session state changed before it could be ended.",
        );
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
      return toClassSessionResult(
        await requireClassSessionDetailsForSchool(transaction, parsed),
      );
    });
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
