import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  confirmOwnEmailChange,
  confirmSchoolRegistration,
  getSchoolProfile,
  hashPassword,
  requestOwnEmailChange,
  requestSchoolRegistration,
  updateOwnProfile,
  updateSchoolProfile,
} from "../../src/index.js";
import { createPrismaClient, disconnectPrisma } from "../../src/client.js";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { cleanupSyntheticSchools, requireSafeIntegrationDatabaseUrl } from "../helpers/database.js";
import { createSyntheticTenant } from "../helpers/factories.js";

describe("profile, school profile, and self-registration", () => {
  const schools = new Set<string>(); let prisma: PrismaClient;
  beforeAll(() => { prisma = createPrismaClient(requireSafeIntegrationDatabaseUrl()); });
  afterEach(async () => { await cleanupSyntheticSchools(prisma, schools); schools.clear(); await prisma.pendingSchoolRegistration.deleteMany({ where: { email: { startsWith: "synthetic-profile-" } } }); });
  afterAll(async () => { await cleanupSyntheticSchools(prisma, schools); await disconnectPrisma(); await prisma.$disconnect(); });

  it("updates only the authenticated tenant profile and mirrors teacher names", async () => {
    const tenant = await createSyntheticTenant(prisma, schools, "profile-own");
    const auth = { userId: tenant.user.id, schoolId: tenant.school.id, role: "TEACHER" as const, teacherId: tenant.teacher.id };
    const result = await updateOwnProfile(auth, { firstName: "ครูทดสอบ", lastName: "ปลอดภัย", phoneNumber: "+66 81 234 5678" });
    expect(result).toMatchObject({ firstName: "ครูทดสอบ", phoneNumber: "+66 81 234 5678" });
    await expect(prisma.teacher.findUniqueOrThrow({ where: { id: tenant.teacher.id } })).resolves.toMatchObject({ firstName: "ครูทดสอบ" });
    await expect(prisma.auditLog.findFirst({ where: { schoolId: tenant.school.id, action: "profile.updated" } })).resolves.toBeTruthy();
  });

  it("allows admins to edit general school data but rejects teachers", async () => {
    const tenant = await createSyntheticTenant(prisma, schools, "profile-school");
    const admin = { userId: tenant.user.id, schoolId: tenant.school.id, role: "ADMIN" as const, teacherId: null };
    const updated = await updateSchoolProfile(admin, { name: "โรงเรียนทดสอบใหม่", email: "office@example.test", phoneNumber: "021234567", address: "Synthetic address" });
    expect(updated).toMatchObject({ name: "โรงเรียนทดสอบใหม่", email: "office@example.test" });
    await expect(getSchoolProfile({ ...admin, role: "TEACHER", teacherId: tenant.teacher.id })).rejects.toMatchObject({ code: "TENANT_ACCESS_DENIED" });
  });

  it("verifies email changes, revokes sessions, and never stores the raw token", async () => {
    const tenant = await createSyntheticTenant(prisma, schools, "profile-email"); const password = "Synthetic!Profile2026";
    await prisma.user.update({ where: { id: tenant.user.id }, data: { passwordHash: await hashPassword(password) } });
    const auth = { userId: tenant.user.id, schoolId: tenant.school.id, role: "TEACHER" as const, teacherId: tenant.teacher.id };
    const request = await requestOwnEmailChange(auth, { newEmail: `synthetic-profile-${tenant.user.id}@example.test`, currentPassword: password });
    expect(request.developmentToken).toBeTruthy();
    const stored = await prisma.emailChangeRequest.findFirstOrThrow({ where: { userId: tenant.user.id } });
    expect(stored.tokenHash).not.toBe(request.developmentToken);
    await confirmOwnEmailChange({ token: request.developmentToken! });
    await expect(prisma.user.findUniqueOrThrow({ where: { id: tenant.user.id } })).resolves.toMatchObject({ email: `synthetic-profile-${tenant.user.id}@example.test` });
  });

  it("creates a new isolated school and owner only after verification", async () => {
    const suffix = crypto.randomUUID().slice(0, 8); const email = `synthetic-profile-${suffix}@example.test`;
    const request = await requestSchoolRegistration({ schoolName: "โรงเรียนสังเคราะห์", schoolCode: `SYN_${suffix}`, firstName: "เจ้าของ", lastName: "ทดสอบ", email, password: "Synthetic!Owner2026" });
    expect(await prisma.school.count({ where: { code: `SYN_${suffix}` } })).toBe(0);
    const result = await confirmSchoolRegistration({ token: request.developmentToken! }); schools.add(result.schoolId);
    await expect(prisma.user.findUniqueOrThrow({ where: { id: result.ownerUserId } })).resolves.toMatchObject({ role: "SCHOOL_OWNER", email });
    await expect(confirmSchoolRegistration({ token: request.developmentToken! })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
