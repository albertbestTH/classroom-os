import type {
  CreateStudentInput,
  StudentResult,
  TenantServiceInput,
  UpdateStudentInput,
} from "@classroom-os/types";
import { z } from "zod";

import { getPrismaClient } from "../client.js";
import { createAuditLogForSchool } from "../repositories/audit.repository.js";
import {
  createStudentForSchool,
  listStudentsForSchool,
  requireStudentForSchool,
  updateStudentForSchool,
} from "../repositories/student.repository.js";
import { createStudentSchema, updateStudentSchema } from "../validation.js";
import { executeTenantService, toStudentResult } from "./service-utils.js";

const studentIdSchema = z.object({
  schoolId: z.string().uuid(),
  studentId: z.string().uuid(),
});

export function createStudent(input: CreateStudentInput): Promise<StudentResult> {
  return executeTenantService(input, async () => {
    const parsed = createStudentSchema.parse(input);
    return getPrismaClient().$transaction(async (transaction) => {
      const student = await createStudentForSchool(transaction, {
        ...parsed,
        dateOfBirth: parsed.dateOfBirth ? new Date(`${parsed.dateOfBirth}T00:00:00.000Z`) : null,
      });
      await createAuditLogForSchool(transaction, {
        schoolId: parsed.schoolId,
        actorUserId: parsed.actorUserId,
        action: "student.created",
        entityType: "Student",
        entityId: student.id,
        metadata: { studentNumber: student.studentNumber },
      });
      return toStudentResult(student);
    });
  });
}

export function updateStudent(input: UpdateStudentInput): Promise<StudentResult> {
  return executeTenantService(input, async () => {
    const parsed = updateStudentSchema.parse(input);
    return getPrismaClient().$transaction(async (transaction) => {
      const { schoolId, actorUserId, studentId, ...fields } = parsed;
      const student = await updateStudentForSchool(transaction, {
        schoolId,
        studentId,
        data: {
          ...fields,
          ...(fields.dateOfBirth !== undefined
            ? {
                dateOfBirth: fields.dateOfBirth
                  ? new Date(`${fields.dateOfBirth}T00:00:00.000Z`)
                  : null,
              }
            : {}),
        },
      });
      await createAuditLogForSchool(transaction, {
        schoolId,
        actorUserId,
        action: "student.updated",
        entityType: "Student",
        entityId: student.id,
        metadata: { fields: Object.keys(fields) },
      });
      return toStudentResult(student);
    });
  });
}

export function getStudent(
  input: TenantServiceInput & { studentId: string },
): Promise<StudentResult> {
  return executeTenantService(input, async () => {
    const parsed = studentIdSchema.parse(input);
    const student = await requireStudentForSchool(getPrismaClient(), parsed);
    return toStudentResult(student);
  });
}

export function listStudents(
  input: TenantServiceInput & {
    query?: string;
    isActive?: boolean;
    classroomId?: string;
    termId?: string;
  },
): Promise<StudentResult[]> {
  return executeTenantService(input, async () => {
    const students = await listStudentsForSchool(getPrismaClient(), input);
    return students.map(toStudentResult);
  });
}
