import type {
  AuditLog,
  Prisma,
  PrismaClient,
} from "../generated/prisma/client.js";
import { requireRecordId, requireSchoolId, type TenantScope } from "../tenant.js";
import { requireTenantReferencesForSchool } from "./reference.repository.js";

type AuditClient = Pick<
  PrismaClient,
  "auditLog" | "user" | "term" | "teacher" | "classroom" | "subject"
>;

export type CreateAuditLogInput = TenantScope & {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonObject;
};

export async function createAuditLogForSchool(
  client: AuditClient,
  input: CreateAuditLogInput,
): Promise<AuditLog> {
  const schoolId = requireSchoolId(input);
  const entityId = requireRecordId(input.entityId, "entityId");
  const action = input.action.trim();
  const entityType = input.entityType.trim();

  if (input.actorUserId) {
    await requireTenantReferencesForSchool(client, {
      schoolId,
      userId: input.actorUserId,
    });
  }

  return client.auditLog.create({
    data: {
      schoolId,
      actorUserId: input.actorUserId ?? null,
      action,
      entityType,
      entityId,
      metadata: input.metadata ?? {},
    },
  });
}

export async function listAuditLogsForEntityForSchool(
  client: AuditClient,
  input: TenantScope & { entityType: string; entityId: string },
): Promise<AuditLog[]> {
  const schoolId = requireSchoolId(input);
  const entityId = requireRecordId(input.entityId, "entityId");

  return client.auditLog.findMany({
    where: { schoolId, entityType: input.entityType.trim(), entityId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
}
