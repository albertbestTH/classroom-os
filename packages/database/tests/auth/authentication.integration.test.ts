import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  authenticateWithPassword,
  hashPassword,
  requireAssessmentAccess,
  requireAttendanceAccess,
  requireClassSessionAccess,
  requireRole,
  requireSchoolAccess,
  requireScoreAccess,
  requireTeachingAssignment,
  resolveServerSession,
  revokeServerSession,
  trustedTenantInput,
  type AuthError,
} from "../../src/index.js";
import { createPrismaClient, disconnectPrisma } from "../../src/client.js";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { cleanupSyntheticSchools, requireSafeIntegrationDatabaseUrl } from "../helpers/database.js";
import { createSyntheticTenant } from "../helpers/factories.js";

function expectAuthCode(error: unknown, code: AuthError["code"]): boolean {
  expect(error).toMatchObject({ code });
  return true;
}

describe("authentication and teacher authorization", () => {
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

  it("creates a trusted context, stores only a token hash, and audits login/logout", async () => {
    const tenant = await createSyntheticTenant(prisma, trackedSchoolIds, "auth-login");
    const password = "Synthetic!Login2026";
    await prisma.user.update({
      where: { id: tenant.user.id },
      data: { passwordHash: await hashPassword(password) },
    });

    await expect(
      authenticateWithPassword({ email: tenant.user.email, password: "Wrong!Password9" }),
    ).rejects.toSatisfy((error) => expectAuthCode(error, "INVALID_CREDENTIALS"));

    const login = await authenticateWithPassword({
      email: tenant.user.email.toUpperCase(),
      password,
    });
    const resolved = await resolveServerSession(login.token);
    expect(resolved.context).toEqual({
      userId: tenant.user.id,
      schoolId: tenant.school.id,
      role: "TEACHER",
      teacherId: tenant.teacher.id,
    });

    const storedSession = await prisma.authSession.findFirstOrThrow({
      where: { userId: tenant.user.id },
    });
    expect(storedSession.tokenHash).toHaveLength(64);
    expect(storedSession.tokenHash).not.toBe(login.token);
    expect(JSON.stringify(storedSession)).not.toContain(password);

    await revokeServerSession(login.token);
    await expect(resolveServerSession(login.token)).rejects.toSatisfy((error) =>
      expectAuthCode(error, "UNAUTHENTICATED"),
    );
    const eventTypes = (
      await prisma.authenticationEvent.findMany({
        where: { userId: tenant.user.id },
        orderBy: { createdAt: "asc" },
      })
    ).map((event) => event.type);
    expect(eventTypes).toEqual(["LOGIN_FAILURE", "LOGIN_SUCCESS", "LOGOUT"]);
  });

  it("rejects disabled accounts and does not issue a session", async () => {
    const tenant = await createSyntheticTenant(prisma, trackedSchoolIds, "auth-disabled");
    const password = "Synthetic!Disabled2026";
    await prisma.user.update({
      where: { id: tenant.user.id },
      data: { status: "DISABLED", passwordHash: await hashPassword(password) },
    });

    await expect(
      authenticateWithPassword({ email: tenant.user.email, password }),
    ).rejects.toSatisfy((error) => expectAuthCode(error, "ACCOUNT_DISABLED"));
    await expect(prisma.authSession.count({ where: { userId: tenant.user.id } })).resolves.toBe(0);
    const event = await prisma.authenticationEvent.findFirstOrThrow({
      where: { userId: tenant.user.id },
    });
    expect(event).toMatchObject({ type: "LOGIN_FAILURE", reason: "account_disabled" });
  });

  it("enforces stable role and tenant boundaries and overwrites untrusted scope", async () => {
    const tenantA = await createSyntheticTenant(prisma, trackedSchoolIds, "auth-scope-a");
    const tenantB = await createSyntheticTenant(prisma, trackedSchoolIds, "auth-scope-b");
    const teacherContext = {
      userId: tenantA.user.id,
      schoolId: tenantA.school.id,
      role: "TEACHER" as const,
      teacherId: tenantA.teacher.id,
    };

    expect(() => requireRole(teacherContext, "ADMIN")).toThrowError(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
    expect(() => requireSchoolAccess(teacherContext, tenantB.school.id)).toThrowError(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
    expect(
      trustedTenantInput(teacherContext, {
        schoolId: tenantB.school.id,
        actorUserId: tenantB.user.id,
        value: "synthetic",
      }),
    ).toMatchObject({
      schoolId: tenantA.school.id,
      actorUserId: tenantA.user.id,
      value: "synthetic",
    });
  });

  it("enforces owner, admin, and teacher role permissions", async () => {
    const tenant = await createSyntheticTenant(prisma, trackedSchoolIds, "auth-roles");
    const ownerContext = {
      userId: tenant.user.id,
      schoolId: tenant.school.id,
      role: "SCHOOL_OWNER" as const,
      teacherId: null,
    };
    const adminContext = { ...ownerContext, role: "ADMIN" as const };
    const teacherContext = {
      ...ownerContext,
      role: "TEACHER" as const,
      teacherId: tenant.teacher.id,
    };

    expect(requireRole(ownerContext, "SCHOOL_OWNER")).toBe(ownerContext);
    expect(requireRole(adminContext, ["SCHOOL_OWNER", "ADMIN"])).toBe(adminContext);
    expect(() => requireRole(adminContext, "SCHOOL_OWNER")).toThrowError(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
    expect(() => requireRole(teacherContext, ["SCHOOL_OWNER", "ADMIN"])).toThrowError(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );

    const unassignedClassroom = await prisma.classroom.create({
      data: {
        schoolId: tenant.school.id,
        code: `ROLE-C-${tenant.school.id}`,
        name: "Synthetic role-only classroom",
        gradeLevel: "TEST-5",
      },
    });
    const unassignedRequirement = {
      schoolId: tenant.school.id,
      termId: tenant.term.id,
      classroomId: unassignedClassroom.id,
      subjectId: tenant.subject.id,
    };
    await expect(requireTeachingAssignment(ownerContext, unassignedRequirement)).resolves.toBeUndefined();
    await expect(requireTeachingAssignment(adminContext, unassignedRequirement)).resolves.toBeUndefined();
    await expect(requireTeachingAssignment(teacherContext, unassignedRequirement)).rejects.toSatisfy(
      (error) => expectAuthCode(error, "FORBIDDEN"),
    );
  });

  it("allows multiple assigned classrooms but denies unassigned and cross-school resources", async () => {
    const tenant = await createSyntheticTenant(prisma, trackedSchoolIds, "auth-multi");
    const otherTenant = await createSyntheticTenant(prisma, trackedSchoolIds, "auth-multi-other");
    const context = {
      userId: tenant.user.id,
      schoolId: tenant.school.id,
      role: "TEACHER" as const,
      teacherId: tenant.teacher.id,
    };
    const classB = await prisma.classroom.create({
      data: { schoolId: tenant.school.id, code: `B-${tenant.school.id}`, name: "Synthetic B", gradeLevel: "TEST-5" },
    });
    const classC = await prisma.classroom.create({
      data: { schoolId: tenant.school.id, code: `C-${tenant.school.id}`, name: "Synthetic C", gradeLevel: "TEST-5" },
    });
    const assignmentB = await prisma.teachingAssignment.create({
      data: {
        schoolId: tenant.school.id,
        termId: tenant.term.id,
        teacherId: tenant.teacher.id,
        classroomId: classB.id,
        subjectId: tenant.subject.id,
      },
    });
    const otherTeacher = await prisma.teacher.create({
      data: {
        schoolId: tenant.school.id,
        employeeCode: `OTHER-${tenant.school.id}`,
        firstName: "Other",
        lastName: "Teacher",
      },
    });
    const assignmentC = await prisma.teachingAssignment.create({
      data: {
        schoolId: tenant.school.id,
        termId: tenant.term.id,
        teacherId: otherTeacher.id,
        classroomId: classC.id,
        subjectId: tenant.subject.id,
      },
    });

    const requirement = (classroomId: string) => ({
      schoolId: tenant.school.id,
      termId: tenant.term.id,
      classroomId,
      subjectId: tenant.subject.id,
    });
    await expect(requireTeachingAssignment(context, requirement(tenant.classroom.id))).resolves.toBeUndefined();
    await expect(requireTeachingAssignment(context, requirement(classB.id))).resolves.toBeUndefined();
    await expect(requireTeachingAssignment(context, requirement(classC.id))).rejects.toSatisfy((error) =>
      expectAuthCode(error, "FORBIDDEN"),
    );
    await expect(
      requireTeachingAssignment(context, {
        schoolId: otherTenant.school.id,
        termId: otherTenant.term.id,
        classroomId: otherTenant.classroom.id,
        subjectId: otherTenant.subject.id,
      }),
    ).rejects.toSatisfy((error) => expectAuthCode(error, "FORBIDDEN"));

    const createSession = (classroomId: string) =>
      prisma.classSession.create({
        data: {
          schoolId: tenant.school.id,
          termId: tenant.term.id,
          teacherId: tenant.teacher.id,
          classroomId,
          subjectId: tenant.subject.id,
          teachingAssignmentId:
            classroomId === tenant.classroom.id
              ? tenant.teachingAssignment.id
              : classroomId === classB.id
                ? assignmentB.id
                : assignmentC.id,
          scheduledStart: new Date(`2026-09-${classroomId === tenant.classroom.id ? "01" : classroomId === classB.id ? "02" : "03"}T01:00:00.000Z`),
          scheduledEnd: new Date(`2026-09-${classroomId === tenant.classroom.id ? "01" : classroomId === classB.id ? "02" : "03"}T01:50:00.000Z`),
        },
      });
    const [sessionA, sessionB, sessionC] = await Promise.all([
      createSession(tenant.classroom.id),
      createSession(classB.id),
      createSession(classC.id),
    ]);
    await expect(requireClassSessionAccess(context, sessionA.id)).resolves.toBeUndefined();
    await expect(requireAttendanceAccess(context, sessionB.id)).resolves.toBeUndefined();
    await expect(
      requireAttendanceAccess(context, { sessionId: sessionA.id, classroomId: classB.id }),
    ).rejects.toSatisfy((error) => expectAuthCode(error, "FORBIDDEN"));
    await expect(requireAttendanceAccess(context, sessionC.id)).rejects.toSatisfy((error) =>
      expectAuthCode(error, "FORBIDDEN"),
    );

    const createAssessment = (classroomId: string, title: string) =>
      prisma.assessment.create({
        data: {
          schoolId: tenant.school.id,
          termId: tenant.term.id,
          teacherId: tenant.teacher.id,
          classroomId,
          subjectId: tenant.subject.id,
          title,
          type: "quiz",
          maxScore: 10,
        },
      });
    const [assessmentA, assessmentB, assessmentC] = await Promise.all([
      createAssessment(tenant.classroom.id, "Synthetic A"),
      createAssessment(classB.id, "Synthetic B"),
      createAssessment(classC.id, "Synthetic C"),
    ]);
    await expect(requireAssessmentAccess(context, assessmentA.id)).resolves.toBeUndefined();
    await expect(requireScoreAccess(context, assessmentB.id)).resolves.toBeUndefined();
    await expect(
      requireScoreAccess(context, { assessmentId: assessmentA.id, classroomId: classB.id }),
    ).rejects.toSatisfy((error) => expectAuthCode(error, "FORBIDDEN"));
    await expect(requireScoreAccess(context, assessmentC.id)).rejects.toSatisfy((error) =>
      expectAuthCode(error, "FORBIDDEN"),
    );
  });
});
