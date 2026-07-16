import type {
  Prisma,
  PrismaClient,
  SessionTimelineEventType,
} from "../generated/prisma/client.js";
import { requireRecordId, requireSchoolId, type TenantScope } from "../tenant.js";

type TimelineClient = Pick<PrismaClient, "sessionTimelineEvent">;

export function createSessionTimelineEventForSchool(
  client: TimelineClient,
  input: TenantScope & {
    classSessionId: string;
    actorUserId?: string | null;
    eventType: SessionTimelineEventType;
    metadata?: Prisma.InputJsonObject;
  },
) {
  const schoolId = requireSchoolId(input);
  return client.sessionTimelineEvent.create({
    data: {
      schoolId,
      classSessionId: requireRecordId(input.classSessionId, "classSessionId"),
      actorUserId: input.actorUserId ?? null,
      eventType: input.eventType,
      metadata: input.metadata ?? {},
    },
  });
}

export function listSessionTimelineForSchool(
  client: TimelineClient,
  input: TenantScope & { sessionId: string },
) {
  const schoolId = requireSchoolId(input);
  return client.sessionTimelineEvent.findMany({
    where: {
      schoolId,
      classSessionId: requireRecordId(input.sessionId, "sessionId"),
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}
