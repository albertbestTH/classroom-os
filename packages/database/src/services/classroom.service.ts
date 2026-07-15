import type {
  ClassroomResult,
  CreateClassroomInput,
  TenantServiceInput,
  UpdateClassroomInput,
} from "@classroom-os/types";
import { z } from "zod";

import { getPrismaClient } from "../client.js";
import { createAuditLogForSchool } from "../repositories/audit.repository.js";
import {
  createClassroomForSchool,
  listClassroomsForSchool,
  requireClassroomForSchool,
  updateClassroomForSchool,
} from "../repositories/classroom.repository.js";
import { requireTenantReferencesForSchool } from "../repositories/reference.repository.js";
import { createClassroomSchema, updateClassroomSchema } from "../validation.js";
import { executeTenantService, toClassroomResult } from "./service-utils.js";

const classroomIdSchema = z.object({
  schoolId: z.string().uuid(),
  classroomId: z.string().uuid(),
});

export function createClassroom(input: CreateClassroomInput): Promise<ClassroomResult> {
  return executeTenantService(input, async () => {
    const parsed = createClassroomSchema.parse(input);
    return getPrismaClient().$transaction(async (transaction) => {
      if (parsed.homeroomTeacherId) {
        await requireTenantReferencesForSchool(transaction, {
          schoolId: parsed.schoolId,
          teacherId: parsed.homeroomTeacherId,
        });
      }
      const classroom = await createClassroomForSchool(transaction, parsed);
      await createAuditLogForSchool(transaction, {
        schoolId: parsed.schoolId,
        actorUserId: parsed.actorUserId,
        action: "classroom.created",
        entityType: "Classroom",
        entityId: classroom.id,
        metadata: { code: classroom.code },
      });
      return toClassroomResult(classroom);
    });
  });
}

export function updateClassroom(input: UpdateClassroomInput): Promise<ClassroomResult> {
  return executeTenantService(input, async () => {
    const parsed = updateClassroomSchema.parse(input);
    return getPrismaClient().$transaction(async (transaction) => {
      const { schoolId, actorUserId, classroomId, ...fields } = parsed;
      if (fields.homeroomTeacherId) {
        await requireTenantReferencesForSchool(transaction, {
          schoolId,
          teacherId: fields.homeroomTeacherId,
        });
      }
      const classroom = await updateClassroomForSchool(transaction, {
        schoolId,
        classroomId,
        data: fields,
      });
      await createAuditLogForSchool(transaction, {
        schoolId,
        actorUserId,
        action: "classroom.updated",
        entityType: "Classroom",
        entityId: classroom.id,
        metadata: { fields: Object.keys(fields) },
      });
      return toClassroomResult(classroom);
    });
  });
}

export function getClassroom(
  input: TenantServiceInput & { classroomId: string },
): Promise<ClassroomResult> {
  return executeTenantService(input, async () => {
    const parsed = classroomIdSchema.parse(input);
    const classroom = await requireClassroomForSchool(getPrismaClient(), parsed);
    return toClassroomResult(classroom);
  });
}

export function listClassrooms(
  input: TenantServiceInput & {
    gradeLevel?: string;
    isActive?: boolean;
    teacherId?: string;
    termId?: string;
  },
): Promise<ClassroomResult[]> {
  return executeTenantService(input, async () => {
    const classrooms = await listClassroomsForSchool(getPrismaClient(), input);
    return classrooms.map(toClassroomResult);
  });
}
