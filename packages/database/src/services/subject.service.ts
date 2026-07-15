import type {
  CreateSubjectInput,
  SubjectResult,
  TenantServiceInput,
  UpdateSubjectInput,
} from "@classroom-os/types";
import { z } from "zod";

import { getPrismaClient } from "../client.js";
import { createAuditLogForSchool } from "../repositories/audit.repository.js";
import {
  createSubjectForSchool,
  listSubjectsForSchool,
  requireSubjectForSchool,
  updateSubjectForSchool,
} from "../repositories/subject.repository.js";
import { executeTenantService } from "./service-utils.js";

const tenantFields = {
  schoolId: z.string().uuid(),
  actorUserId: z.string().uuid().nullable().optional(),
};
const text = z.string().trim().min(1);
const createSubjectSchema = z.object({
  ...tenantFields,
  code: text,
  name: text,
  isActive: z.boolean().optional(),
});
const updateSubjectSchema = z
  .object({
    ...tenantFields,
    subjectId: z.string().uuid(),
    code: text.optional(),
    name: text.optional(),
    isActive: z.boolean().optional(),
  })
  .refine(({ code, name, isActive }) => [code, name, isActive].some((value) => value !== undefined), {
    message: "At least one subject field must be updated.",
  });

function toSubjectResult(subject: Awaited<ReturnType<typeof requireSubjectForSchool>>): SubjectResult {
  return {
    id: subject.id,
    schoolId: subject.schoolId,
    code: subject.code,
    name: subject.name,
    isActive: subject.isActive,
    createdAt: subject.createdAt.toISOString(),
    updatedAt: subject.updatedAt.toISOString(),
  };
}

export function listSubjects(
  input: TenantServiceInput & { isActive?: boolean },
): Promise<SubjectResult[]> {
  return executeTenantService(input, async () => {
    const subjects = await listSubjectsForSchool(getPrismaClient(), input);
    return subjects.map(toSubjectResult);
  });
}

export function getSubject(
  input: TenantServiceInput & { subjectId: string },
): Promise<SubjectResult> {
  return executeTenantService(input, async () => {
    const parsed = z.object({ ...tenantFields, subjectId: z.string().uuid() }).parse(input);
    return toSubjectResult(await requireSubjectForSchool(getPrismaClient(), parsed));
  });
}

export function createSubject(input: CreateSubjectInput): Promise<SubjectResult> {
  return executeTenantService(input, async () => {
    const parsed = createSubjectSchema.parse(input);
    return getPrismaClient().$transaction(async (transaction) => {
      const subject = await createSubjectForSchool(transaction, parsed);
      await createAuditLogForSchool(transaction, {
        schoolId: parsed.schoolId,
        actorUserId: parsed.actorUserId,
        action: "subject.created",
        entityType: "Subject",
        entityId: subject.id,
        metadata: { code: subject.code },
      });
      return toSubjectResult(subject);
    });
  });
}

export function updateSubject(input: UpdateSubjectInput): Promise<SubjectResult> {
  return executeTenantService(input, async () => {
    const parsed = updateSubjectSchema.parse(input);
    return getPrismaClient().$transaction(async (transaction) => {
      const { schoolId, actorUserId, subjectId, ...data } = parsed;
      const subject = await updateSubjectForSchool(transaction, { schoolId, subjectId, data });
      await createAuditLogForSchool(transaction, {
        schoolId,
        actorUserId,
        action: "subject.updated",
        entityType: "Subject",
        entityId: subject.id,
        metadata: { fields: Object.keys(data) },
      });
      return toSubjectResult(subject);
    });
  });
}
