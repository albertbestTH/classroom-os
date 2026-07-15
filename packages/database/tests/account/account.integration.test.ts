import { randomUUID } from "node:crypto";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  assignTeacherProfile,
  assignTeacherToClass,
  authenticateWithPassword,
  createStaffAccount,
  listStaffUsers,
  listTeachingAssignments,
  resolveServerSession,
  setStaffAccountStatus,
} from "../../src/index.js";
import { createPrismaClient, disconnectPrisma } from "../../src/client.js";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { cleanupSyntheticSchools, requireSafeIntegrationDatabaseUrl } from "../helpers/database.js";
import { createSyntheticTenant } from "../helpers/factories.js";

describe("staff account management", () => {
  const trackedSchoolIds = new Set<string>();
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = createPrismaClient(requireSafeIntegrationDatabaseUrl());
  });

  afterEach(async () => {
    await cleanupSyntheticSchools(prisma, trackedSchoolIds);
    trackedSchoolIds.clear();
  });

  afterAll(async () => {
    await cleanupSyntheticSchools(prisma, trackedSchoolIds);
    await disconnectPrisma();
    await prisma.$disconnect();
  });

  async function createManager(role: "SCHOOL_OWNER" | "ADMIN") {
    const tenant = await createSyntheticTenant(prisma, trackedSchoolIds, `account-${role}`);
    const user = await prisma.user.create({
      data: {
        schoolId: tenant.school.id,
        email: `${role.toLowerCase()}-${randomUUID()}@example.invalid`,
        firstName: "Synthetic",
        lastName: role,
        role,
      },
    });
    return {
      tenant,
      auth: { userId: user.id, schoolId: tenant.school.id, role, teacherId: null },
    };
  }

  it("allows an owner to create staff, profile a teacher, and assign multiple classes", async () => {
    const { tenant, auth } = await createManager("SCHOOL_OWNER");
    const teacher = await createStaffAccount({
      auth,
      account: {
        email: `teacher-${randomUUID()}@example.invalid`,
        firstName: "Synthetic",
        lastName: "Managed Teacher",
        role: "TEACHER",
        temporaryPassword: "Synthetic!Managed2026",
      },
    });
    const profile = await assignTeacherProfile({
      auth,
      profile: { userId: teacher.id, employeeCode: `EMP-${randomUUID()}` },
    });
    const classroomB = await prisma.classroom.create({
      data: {
        schoolId: tenant.school.id,
        code: `B-${randomUUID()}`,
        name: "Synthetic managed B",
        gradeLevel: "TEST-5",
      },
    });
    await assignTeacherToClass({
      auth,
      assignment: {
        userId: teacher.id,
        termId: tenant.term.id,
        classroomId: tenant.classroom.id,
        subjectId: tenant.subject.id,
      },
    });
    await assignTeacherToClass({
      auth,
      assignment: {
        userId: teacher.id,
        termId: tenant.term.id,
        classroomId: classroomB.id,
        subjectId: tenant.subject.id,
      },
    });

    const assignments = await listTeachingAssignments({ auth, userId: teacher.id });
    expect(profile.userId).toBe(teacher.id);
    expect(assignments.map(({ classroomId }) => classroomId)).toEqual(
      expect.arrayContaining([tenant.classroom.id, classroomB.id]),
    );
    const auditText = JSON.stringify(
      await prisma.auditLog.findMany({ where: { schoolId: tenant.school.id } }),
    );
    expect(auditText).not.toMatch(/Synthetic!Managed2026|passwordHash|token|cookie|secret/i);
  });

  it("enforces owner, admin, and teacher account-management roles", async () => {
    const { tenant, auth: adminAuth } = await createManager("ADMIN");
    await expect(
      createStaffAccount({
        auth: adminAuth,
        account: {
          email: `owner-${randomUUID()}@example.invalid`,
          firstName: "Synthetic",
          lastName: "Owner",
          role: "SCHOOL_OWNER",
          temporaryPassword: "Synthetic!Owner2026",
        },
      }),
    ).rejects.toMatchObject({ code: "TENANT_ACCESS_DENIED" });

    const adminCreated = await createStaffAccount({
      auth: adminAuth,
      account: {
        email: `admin-${randomUUID()}@example.invalid`,
        firstName: "Synthetic",
        lastName: "Admin",
        role: "ADMIN",
        temporaryPassword: "Synthetic!Manager2026",
      },
    });
    expect(adminCreated.role).toBe("ADMIN");
    await expect(
      listStaffUsers({
        auth: {
          userId: tenant.user.id,
          schoolId: tenant.school.id,
          role: "TEACHER",
          teacherId: tenant.teacher.id,
        },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("revokes active sessions when an account is disabled and audits the change", async () => {
    const { tenant, auth } = await createManager("SCHOOL_OWNER");
    const password = "Synthetic!Disable2026";
    const staff = await createStaffAccount({
      auth,
      account: {
        email: `disable-${randomUUID()}@example.invalid`,
        firstName: "Synthetic",
        lastName: "Disable Target",
        role: "ADMIN",
        temporaryPassword: password,
      },
    });
    const login = await authenticateWithPassword({ email: staff.email, password });
    await expect(resolveServerSession(login.token)).resolves.toBeDefined();

    await setStaffAccountStatus({
      auth,
      change: { userId: staff.id, status: "DISABLED" },
    });
    await expect(resolveServerSession(login.token)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
    const session = await prisma.authSession.findFirstOrThrow({ where: { userId: staff.id } });
    expect(session.revokedAt).toBeInstanceOf(Date);
    await expect(
      prisma.auditLog.count({
        where: {
          schoolId: tenant.school.id,
          actorUserId: auth.userId,
          entityId: staff.id,
          action: "staff.disabled",
        },
      }),
    ).resolves.toBe(1);
  });
});
