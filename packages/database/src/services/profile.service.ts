import { createHash, randomBytes } from "node:crypto";

import type {
  ConfirmEmailChangeInput,
  ConfirmSchoolRegistrationInput,
  CurrentUserResult,
  RegisterSchoolInput,
  RequestEmailChangeInput,
  SchoolProfileResult,
  SchoolRegistrationResult,
  TrustedAuthContext,
  UpdateOwnProfileInput,
  UpdateSchoolProfileInput,
  VerificationRequestResult,
} from "@classroom-os/types";
import { z } from "zod";

import { getPrismaClient } from "../client.js";
import { domainError, withDomainErrors } from "../domain-errors.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { normalizeEmail } from "../auth/authentication.service.js";

const verificationLifetimeMs = 30 * 60 * 1_000;
const name = z.string().trim().min(1).max(100);
const phone = z.string().trim().min(7).max(30).regex(/^[+()\d\s.-]+$/).nullable().optional();
const email = z.string().trim().email().max(254).transform(normalizeEmail);
const token = z.string().trim().min(32).max(256);

const ownProfileSchema = z.object({ firstName: name, lastName: name, phoneNumber: phone });
const schoolProfileSchema = z.object({
  name,
  email: z.union([email, z.literal(""), z.null()]).optional().transform((value) => value || null),
  phoneNumber: phone,
  address: z.string().trim().max(500).nullable().optional(),
});
const registrationSchema = z.object({
  schoolName: name,
  schoolCode: z.string().trim().toUpperCase().min(2).max(30).regex(/^[A-Z0-9_-]+$/),
  firstName: name,
  lastName: name,
  phoneNumber: phone,
  email,
  password: z.string().min(12).max(128)
    .regex(/[a-z]/).regex(/[A-Z]/).regex(/\d/).regex(/[^A-Za-z0-9]/),
});
const emailChangeSchema = z.object({ newEmail: email, currentPassword: z.string().min(1).max(1024) });

function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function issueToken(): { value: string; hash: string; expiresAt: Date } {
  const value = randomBytes(32).toString("base64url");
  return { value, hash: hashToken(value), expiresAt: new Date(Date.now() + verificationLifetimeMs) };
}

function verificationResult(value: string, expiresAt: Date): VerificationRequestResult {
  return {
    expiresAt: expiresAt.toISOString(),
    ...(process.env.NODE_ENV !== "production" ? { developmentToken: value } : {}),
  };
}

async function currentUser(userId: string, schoolId: string): Promise<CurrentUserResult> {
  const prisma = getPrismaClient();
  const user = await prisma.user.findFirst({
    where: { id: userId, schoolId },
    include: {
      school: { select: { name: true } },
      teacherProfile: { select: { id: true, employeeCode: true, _count: { select: { teachingAssignments: true } } } },
    },
  });
  if (!user) throw domainError("NOT_FOUND", "The account was not found for this school.");
  return {
    userId: user.id, schoolId: user.schoolId, role: user.role,
    teacherId: user.teacherProfile?.id ?? null, email: user.email,
    firstName: user.firstName, lastName: user.lastName, phoneNumber: user.phoneNumber,
    schoolName: user.school.name, employeeCode: user.teacherProfile?.employeeCode ?? null,
    assignmentCount: user.teacherProfile?._count.teachingAssignments ?? 0,
  };
}

export function getOwnProfile(auth: TrustedAuthContext): Promise<CurrentUserResult> {
  return withDomainErrors(() => currentUser(auth.userId, auth.schoolId));
}

export function updateOwnProfile(auth: TrustedAuthContext, input: UpdateOwnProfileInput): Promise<CurrentUserResult> {
  return withDomainErrors(async () => {
    const parsed = ownProfileSchema.parse(input);
    const prisma = getPrismaClient();
    const existing = await prisma.user.findFirst({ where: { id: auth.userId, schoolId: auth.schoolId }, select: { id: true, teacherProfile: { select: { id: true } } } });
    if (!existing) throw domainError("NOT_FOUND", "The account was not found for this school.");
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: existing.id }, data: parsed });
      if (existing.teacherProfile) {
        await tx.teacher.update({ where: { id: existing.teacherProfile.id }, data: { firstName: parsed.firstName, lastName: parsed.lastName } });
      }
      await tx.auditLog.create({ data: { schoolId: auth.schoolId, actorUserId: auth.userId, action: "profile.updated", entityType: "User", entityId: auth.userId, metadata: { fields: ["firstName", "lastName", "phoneNumber"] } } });
    });
    return currentUser(auth.userId, auth.schoolId);
  });
}

export function requestOwnEmailChange(auth: TrustedAuthContext, input: RequestEmailChangeInput): Promise<VerificationRequestResult> {
  return withDomainErrors(async () => {
    const parsed = emailChangeSchema.parse(input);
    const prisma = getPrismaClient();
    const user = await prisma.user.findFirst({ where: { id: auth.userId, schoolId: auth.schoolId } });
    if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, parsed.currentPassword))) {
      throw domainError("VALIDATION_ERROR", "The current password is incorrect.");
    }
    if (parsed.newEmail === user.email) throw domainError("CONFLICT", "The new email is unchanged.");
    if (await prisma.user.findUnique({ where: { email: parsed.newEmail }, select: { id: true } })) throw domainError("CONFLICT", "This email is already in use.");
    const issued = issueToken();
    await prisma.emailChangeRequest.create({ data: { schoolId: auth.schoolId, userId: auth.userId, newEmail: parsed.newEmail, tokenHash: issued.hash, expiresAt: issued.expiresAt } });
    return verificationResult(issued.value, issued.expiresAt);
  });
}

export function confirmOwnEmailChange(input: ConfirmEmailChangeInput): Promise<void> {
  return withDomainErrors(async () => {
    const parsed = z.object({ token }).parse(input);
    const prisma = getPrismaClient();
    const request = await prisma.emailChangeRequest.findUnique({ where: { tokenHash: hashToken(parsed.token) } });
    if (!request || request.consumedAt || request.expiresAt <= new Date()) throw domainError("VALIDATION_ERROR", "The verification token is invalid or expired.");
    await prisma.$transaction(async (tx) => {
      if (await tx.user.findUnique({ where: { email: request.newEmail }, select: { id: true } })) throw domainError("CONFLICT", "This email is already in use.");
      const now = new Date();
      await tx.user.update({ where: { id: request.userId }, data: { email: request.newEmail } });
      await tx.emailChangeRequest.update({ where: { id: request.id }, data: { consumedAt: now } });
      await tx.authSession.updateMany({ where: { userId: request.userId, revokedAt: null }, data: { revokedAt: now } });
      await tx.auditLog.create({ data: { schoolId: request.schoolId, actorUserId: request.userId, action: "profile.email_changed", entityType: "User", entityId: request.userId, metadata: {} } });
    });
  });
}

export function getSchoolProfile(auth: TrustedAuthContext): Promise<SchoolProfileResult> {
  return withDomainErrors(async () => {
    if (auth.role === "TEACHER") throw domainError("TENANT_ACCESS_DENIED", "School administration access is required.");
    const school = await getPrismaClient().school.findUnique({ where: { id: auth.schoolId } });
    if (!school) throw domainError("NOT_FOUND", "The school was not found.");
    return { id: school.id, name: school.name, code: school.code, timezone: school.timezone, email: school.email, phoneNumber: school.phoneNumber, address: school.address };
  });
}

export function updateSchoolProfile(auth: TrustedAuthContext, input: UpdateSchoolProfileInput): Promise<SchoolProfileResult> {
  return withDomainErrors(async () => {
    if (auth.role === "TEACHER") throw domainError("TENANT_ACCESS_DENIED", "School administration access is required.");
    const parsed = schoolProfileSchema.parse(input);
    const prisma = getPrismaClient();
    await prisma.$transaction(async (tx) => {
      await tx.school.update({ where: { id: auth.schoolId }, data: parsed });
      await tx.auditLog.create({ data: { schoolId: auth.schoolId, actorUserId: auth.userId, action: "school.profile_updated", entityType: "School", entityId: auth.schoolId, metadata: { fields: ["name", "email", "phoneNumber", "address"] } } });
    });
    return getSchoolProfile(auth);
  });
}

export function requestSchoolRegistration(input: RegisterSchoolInput): Promise<VerificationRequestResult> {
  return withDomainErrors(async () => {
    const parsed = registrationSchema.parse(input);
    const prisma = getPrismaClient();
    if (await prisma.user.findUnique({ where: { email: parsed.email }, select: { id: true } })) throw domainError("CONFLICT", "This email is already in use.");
    if (await prisma.school.findUnique({ where: { code: parsed.schoolCode }, select: { id: true } })) throw domainError("CONFLICT", "This school code is already in use.");
    const issued = issueToken();
    const { password, ...registration } = parsed;
    await prisma.pendingSchoolRegistration.deleteMany({ where: { consumedAt: null, OR: [{ email: parsed.email }, { schoolCode: parsed.schoolCode }] } });
    await prisma.pendingSchoolRegistration.create({ data: { ...registration, passwordHash: await hashPassword(password), tokenHash: issued.hash, expiresAt: issued.expiresAt } });
    return verificationResult(issued.value, issued.expiresAt);
  });
}

export function confirmSchoolRegistration(input: ConfirmSchoolRegistrationInput): Promise<SchoolRegistrationResult> {
  return withDomainErrors(async () => {
    const parsed = z.object({ token }).parse(input);
    const prisma = getPrismaClient();
    const pending = await prisma.pendingSchoolRegistration.findUnique({ where: { tokenHash: hashToken(parsed.token) } });
    if (!pending || pending.consumedAt || pending.expiresAt <= new Date()) throw domainError("VALIDATION_ERROR", "The verification token is invalid or expired.");
    return prisma.$transaction(async (tx) => {
      if (await tx.user.findUnique({ where: { email: pending.email }, select: { id: true } })) throw domainError("CONFLICT", "This email is already in use.");
      if (await tx.school.findUnique({ where: { code: pending.schoolCode }, select: { id: true } })) throw domainError("CONFLICT", "This school code is already in use.");
      const school = await tx.school.create({ data: { name: pending.schoolName, code: pending.schoolCode, timezone: pending.timezone, email: pending.email } });
      const owner = await tx.user.create({ data: { schoolId: school.id, email: pending.email, firstName: pending.firstName, lastName: pending.lastName, phoneNumber: pending.phoneNumber, role: "SCHOOL_OWNER", passwordHash: pending.passwordHash } });
      await tx.pendingSchoolRegistration.update({ where: { id: pending.id }, data: { consumedAt: new Date() } });
      await tx.auditLog.create({ data: { schoolId: school.id, actorUserId: owner.id, action: "school.registered", entityType: "School", entityId: school.id, metadata: {} } });
      return { schoolId: school.id, ownerUserId: owner.id, email: owner.email };
    });
  });
}
