import type {
  CreateStudentInput,
  StudentResult,
  TenantServiceInput,
  UpdateStudentInput,
} from "@classroom-os/types";
import { z } from "zod";

import { getPrismaClient } from "../client.js";
import { domainError } from "../domain-errors.js";
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
      if (parsed.classroomId && parsed.termId) {
          const currentRollNumber = await transaction.classEnrollment.aggregate({
            where: {
              schoolId: parsed.schoolId,
              classroomId: parsed.classroomId,
              termId: parsed.termId,
            },
            _max: { rollNumber: true },
          });
          const rollNumber = parsed.rollNumber ?? (currentRollNumber._max.rollNumber ?? 0) + 1;
        await transaction.classEnrollment.create({
          data: {
            schoolId: parsed.schoolId,
            classroomId: parsed.classroomId,
            termId: parsed.termId,
            studentId: student.id,
            rollNumber,
          },
        });
      }
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
      const { schoolId, actorUserId, studentId, classroomId, termId, rollNumber, ...fields } = parsed;
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
      if (rollNumber !== undefined) {
        const enrollment = await transaction.classEnrollment.updateMany({
          where: {
            schoolId,
            studentId,
            classroomId,
            termId,
            isActive: true,
          },
          data: { rollNumber },
        });
        if (enrollment.count === 0) {
          throw domainError("NOT_FOUND", "The active class enrollment was not found.");
        }
      }
      await createAuditLogForSchool(transaction, {
        schoolId,
        actorUserId,
        action: "student.updated",
        entityType: "Student",
        entityId: student.id,
        metadata: {
          fields: [
            ...Object.keys(fields),
            ...(rollNumber !== undefined ? ["rollNumber"] : []),
          ],
        },
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
    return students
      .map(({ rollNumber, ...student }) => ({ ...toStudentResult(student), rollNumber }))
      .sort((left, right) =>
        input.classroomId
          ? (left.rollNumber ?? Number.MAX_SAFE_INTEGER) - (right.rollNumber ?? Number.MAX_SAFE_INTEGER)
          : 0,
      );
  });
}
