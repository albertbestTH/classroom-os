import type {
  AssignTeacherProfileInput,
  CreateStaffAccountInput,
  CreateTeachingAssignmentInput,
  SetStaffAccountStatusInput,
  StaffUserResult,
  TeacherProfileResult,
  TeachingAssignmentResult,
  TrustedAuthContext,
  UserRole,
} from "@classroom-os/types";
import { z } from "zod";

import { requireRole } from "../auth/authorization.js";
import { hashPassword } from "../auth/password.js";
import { getPrismaClient } from "../client.js";
import { domainError, mapToDomainError, withDomainErrors } from "../domain-errors.js";
import { createAuditLogForSchool } from "../repositories/audit.repository.js";
import {
  assignTeacherProfileForSchool,
  createStaffUserForSchool,
  createTeachingAssignmentForSchool,
  listStaffUsersForSchool,
  listTeachingAssignmentsForSchool,
  requireStaffUserForSchool,
  requireTeachingAssignmentForSchool,
  setStaffStatusForSchool,
} from "../repositories/account.repository.js";
import { requireTenantReferencesForSchool } from "../repositories/reference.repository.js";
import { normalizedEmailSchema } from "../validation.js";

type AuthenticatedServiceInput = { auth: TrustedAuthContext };

const uuid = z.string().uuid();
const createStaffSchema = z.object({
  email: normalizedEmailSchema,
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  role: z.enum(["SCHOOL_OWNER", "ADMIN", "TEACHER"]),
  temporaryPassword: z.string().min(1),
});
const setStatusSchema = z.object({ userId: uuid, status: z.enum(["ACTIVE", "DISABLED"]) });
const teacherProfileSchema = z.object({ userId: uuid, employeeCode: z.string().trim().min(1) });
const assignmentSchema = z.object({ userId: uuid, termId: uuid, classroomId: uuid, subjectId: uuid });
const assignmentIdSchema = z.string().uuid();

function parseInput<T>(schema: z.ZodType<T>, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (error) {
    throw mapToDomainError(error);
  }
}

function requireAccountManager(auth: TrustedAuthContext): TrustedAuthContext {
  return requireRole(auth, ["SCHOOL_OWNER", "ADMIN"]);
}

function assertCanManageRole(actorRole: UserRole, targetRole: UserRole): void {
  if (targetRole === "SCHOOL_OWNER" && actorRole !== "SCHOOL_OWNER") {
    throw domainError("TENANT_ACCESS_DENIED", "Only a school owner can manage an owner account.");
  }
}

type StaffRecord = {
  id: string;
  schoolId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: StaffUserResult["role"];
  status: StaffUserResult["status"];
  lastLoginAt: Date | null;
  createdAt: Date;
  teacherProfile: { id: string; employeeCode: string } | null;
};

function toStaffResult(user: StaffRecord): StaffUserResult {
  return {
    id: user.id,
    schoolId: user.schoolId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
    teacherId: user.teacherProfile?.id ?? null,
    employeeCode: user.teacherProfile?.employeeCode ?? null,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

function toAssignmentResult(
  assignment: Awaited<ReturnType<typeof requireTeachingAssignmentForSchool>>,
): TeachingAssignmentResult {
  if (!assignment.teacher.userId) {
    throw domainError("VALIDATION_ERROR", "The teaching assignment is not linked to a staff account.");
  }
  return {
    id: assignment.id,
    schoolId: assignment.schoolId,
    userId: assignment.teacher.userId,
    teacherId: assignment.teacherId,
    termId: assignment.termId,
    classroomId: assignment.classroomId,
    subjectId: assignment.subjectId,
    createdAt: assignment.createdAt.toISOString(),
  };
}

export async function listStaffUsers(
  input: AuthenticatedServiceInput,
): Promise<StaffUserResult[]> {
  const auth = requireAccountManager(input.auth);
  return withDomainErrors(async () => {
    const users = await listStaffUsersForSchool(getPrismaClient(), auth);
    return users.map((user) => toStaffResult(user));
  });
}

export async function createStaffAccount(
  input: AuthenticatedServiceInput & { account: CreateStaffAccountInput },
): Promise<StaffUserResult> {
  const auth = requireAccountManager(input.auth);
  const account = parseInput(createStaffSchema, input.account);
  assertCanManageRole(auth.role, account.role);
  let passwordHash: string;
  try {
    passwordHash = await hashPassword(account.temporaryPassword);
  } catch {
    throw domainError("VALIDATION_ERROR", "The temporary password does not meet the password policy.");
  }

  return withDomainErrors(() =>
    getPrismaClient().$transaction(async (transaction) => {
      const user = await createStaffUserForSchool(transaction, {
        schoolId: auth.schoolId,
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        role: account.role,
        passwordHash,
      });
      await createAuditLogForSchool(transaction, {
        schoolId: auth.schoolId,
        actorUserId: auth.userId,
        action: "staff.created",
        entityType: "User",
        entityId: user.id,
        metadata: { role: user.role },
      });
      return toStaffResult(user);
    }),
  );
}

export async function setStaffAccountStatus(
  input: AuthenticatedServiceInput & { change: SetStaffAccountStatusInput },
): Promise<StaffUserResult> {
  const auth = requireAccountManager(input.auth);
  const change = parseInput(setStatusSchema, input.change);
  if (change.userId === auth.userId && change.status === "DISABLED") {
    throw domainError("CONFLICT", "You cannot disable your own account.");
  }

  return withDomainErrors(() =>
    getPrismaClient().$transaction(async (transaction) => {
      const target = await requireStaffUserForSchool(transaction, {
        schoolId: auth.schoolId,
        userId: change.userId,
      });
      assertCanManageRole(auth.role, target.role);
      const user = await setStaffStatusForSchool(transaction, {
        schoolId: auth.schoolId,
        ...change,
      });
      await createAuditLogForSchool(transaction, {
        schoolId: auth.schoolId,
        actorUserId: auth.userId,
        action: `staff.${change.status === "ACTIVE" ? "enabled" : "disabled"}`,
        entityType: "User",
        entityId: user.id,
        metadata: { status: change.status },
      });
      return toStaffResult(user);
    }),
  );
}

export async function assignTeacherProfile(
  input: AuthenticatedServiceInput & { profile: AssignTeacherProfileInput },
): Promise<TeacherProfileResult> {
  const auth = requireAccountManager(input.auth);
  const profile = parseInput(teacherProfileSchema, input.profile);
  return withDomainErrors(() =>
    getPrismaClient().$transaction(async (transaction) => {
      const user = await requireStaffUserForSchool(transaction, {
        schoolId: auth.schoolId,
        userId: profile.userId,
      });
      if (user.role !== "TEACHER") {
        throw domainError("VALIDATION_ERROR", "Only a teacher account can receive a teacher profile.");
      }
      const teacher = await assignTeacherProfileForSchool(transaction, {
        schoolId: auth.schoolId,
        userId: user.id,
        employeeCode: profile.employeeCode,
        firstName: user.firstName,
        lastName: user.lastName,
      });
      await createAuditLogForSchool(transaction, {
        schoolId: auth.schoolId,
        actorUserId: auth.userId,
        action: "teacher_profile.assigned",
        entityType: "Teacher",
        entityId: teacher.id,
        metadata: { userId: user.id },
      });
      return {
        id: teacher.id,
        schoolId: teacher.schoolId,
        userId: user.id,
        employeeCode: teacher.employeeCode,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        isActive: teacher.isActive,
      };
    }),
  );
}

export async function assignTeacherToClass(
  input: AuthenticatedServiceInput & { assignment: CreateTeachingAssignmentInput },
): Promise<TeachingAssignmentResult> {
  const auth = requireAccountManager(input.auth);
  const assignment = parseInput(assignmentSchema, input.assignment);
  return withDomainErrors(() =>
    getPrismaClient().$transaction(async (transaction) => {
      const user = await requireStaffUserForSchool(transaction, {
        schoolId: auth.schoolId,
        userId: assignment.userId,
      });
      if (user.role !== "TEACHER" || !user.teacherProfile?.isActive) {
        throw domainError("VALIDATION_ERROR", "An active teacher profile is required.");
      }
      await requireTenantReferencesForSchool(transaction, {
        schoolId: auth.schoolId,
        termId: assignment.termId,
        classroomId: assignment.classroomId,
        subjectId: assignment.subjectId,
      });
      const created = await createTeachingAssignmentForSchool(transaction, {
        schoolId: auth.schoolId,
        termId: assignment.termId,
        teacherId: user.teacherProfile.id,
        classroomId: assignment.classroomId,
        subjectId: assignment.subjectId,
      });
      await createAuditLogForSchool(transaction, {
        schoolId: auth.schoolId,
        actorUserId: auth.userId,
        action: "teaching_assignment.created",
        entityType: "TeachingAssignment",
        entityId: created.id,
        metadata: {
          userId: user.id,
          termId: created.termId,
          classroomId: created.classroomId,
          subjectId: created.subjectId,
        },
      });
      return toAssignmentResult(created);
    }),
  );
}

export async function listTeachingAssignments(
  input: AuthenticatedServiceInput & { userId?: string },
): Promise<TeachingAssignmentResult[]> {
  const auth = input.auth.role === "TEACHER"
    ? requireRole(input.auth, "TEACHER")
    : requireAccountManager(input.auth);
  const userId = auth.role === "TEACHER" ? auth.userId : input.userId;
  if (auth.role === "TEACHER" && input.userId && input.userId !== auth.userId) {
    throw domainError("TENANT_ACCESS_DENIED", "Teachers can only list their own assignments.");
  }
  return withDomainErrors(async () => {
    const assignments = await listTeachingAssignmentsForSchool(getPrismaClient(), {
      schoolId: auth.schoolId,
      userId,
    });
    return assignments.map(toAssignmentResult);
  });
}

export async function getTeachingAssignment(
  input: AuthenticatedServiceInput & { teachingAssignmentId: string },
): Promise<TeachingAssignmentResult> {
  const id = parseInput(assignmentIdSchema, input.teachingAssignmentId);
  return withDomainErrors(async () => {
    const assignment = await requireTeachingAssignmentForSchool(getPrismaClient(), {
      schoolId: input.auth.schoolId,
      teachingAssignmentId: id,
    });
    if (input.auth.role === "TEACHER" && assignment.teacher.userId !== input.auth.userId) {
      throw domainError("TENANT_ACCESS_DENIED", "The teaching assignment is not accessible.");
    }
    return toAssignmentResult(assignment);
  });
}
