import { randomUUID } from "node:crypto";

import {
  authenticateWithPassword,
  hashPassword,
} from "@classroom-os/database";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { PUT as putScores } from "@/app/api/assessments/[id]/scores/route";
import {
  GET as getAttendance,
  PUT as putAttendance,
} from "@/app/api/sessions/[id]/attendance/route";
import { GET as getSession } from "@/app/api/sessions/[id]/route";
import { GET as getStaff } from "@/app/api/staff/route";
import { GET as getStudents, POST as postStudent } from "@/app/api/students/route";
import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";
import { createPrismaClient, disconnectPrisma } from "../../../packages/database/src/client.js";
import type { PrismaClient } from "../../../packages/database/src/generated/prisma/client.js";
import {
  cleanupSyntheticSchools,
  requireSafeIntegrationDatabaseUrl,
} from "../../../packages/database/tests/helpers/database.js";
import { createSyntheticTenant } from "../../../packages/database/tests/helpers/factories.js";

function apiRequest(
  path: string,
  options: {
    token?: string;
    method?: string;
    json?: unknown;
    rawBody?: string;
    origin?: string;
  } = {},
): NextRequest {
  const headers = new Headers();
  if (options.token) headers.set("cookie", `${AUTH_COOKIE_NAME}=${options.token}`);
  if (options.json !== undefined || options.rawBody !== undefined) {
    headers.set("content-type", "application/json");
  }
  if (options.method && options.method !== "GET") {
    headers.set("origin", options.origin ?? "http://localhost");
  }
  return new NextRequest(`http://localhost${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.rawBody ?? (options.json === undefined ? undefined : JSON.stringify(options.json)),
  });
}

describe("authenticated API routes", () => {
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

  it("returns stable unauthenticated and malformed-input responses", async () => {
    const unauthenticated = await getStudents(apiRequest("/api/students"));
    expect(unauthenticated.status).toBe(401);
    await expect(unauthenticated.json()).resolves.toMatchObject({
      error: { code: "UNAUTHENTICATED" },
    });
  });

  it("enforces multi-class teacher and classroom resource isolation", async () => {
    const tenant = await createSyntheticTenant(prisma, trackedSchoolIds, "api-multi");
    const otherTenant = await createSyntheticTenant(prisma, trackedSchoolIds, "api-other");
    const password = "Synthetic!ApiTeacher2026";
    await prisma.user.update({
      where: { id: tenant.user.id },
      data: { passwordHash: await hashPassword(password) },
    });
    const login = await authenticateWithPassword({ email: tenant.user.email, password });

    const classB = await prisma.classroom.create({
      data: {
        schoolId: tenant.school.id,
        code: `B-${randomUUID()}`,
        name: "Synthetic API class B",
        gradeLevel: "TEST-5",
      },
    });
    const classC = await prisma.classroom.create({
      data: {
        schoolId: tenant.school.id,
        code: `C-${randomUUID()}`,
        name: "Synthetic API class C",
        gradeLevel: "TEST-5",
      },
    });
    await prisma.teachingAssignment.create({
      data: {
        schoolId: tenant.school.id,
        termId: tenant.term.id,
        teacherId: tenant.teacher.id,
        classroomId: classB.id,
        subjectId: tenant.subject.id,
      },
    });
    const studentB = await prisma.student.create({
      data: {
        schoolId: tenant.school.id,
        studentNumber: `B-${randomUUID()}`,
        firstName: "Synthetic",
        lastName: "Student B",
      },
    });
    const studentC = await prisma.student.create({
      data: {
        schoolId: tenant.school.id,
        studentNumber: `C-${randomUUID()}`,
        firstName: "Synthetic",
        lastName: "Student C",
      },
    });
    for (const [studentId, classroomId] of [
      [tenant.student.id, tenant.classroom.id],
      [studentB.id, classB.id],
      [studentC.id, classC.id],
    ] as const) {
      await prisma.classEnrollment.create({
        data: {
          schoolId: tenant.school.id,
          termId: tenant.term.id,
          classroomId,
          studentId,
        },
      });
    }

    const studentsA = await getStudents(
      apiRequest(`/api/students?classroomId=${tenant.classroom.id}&termId=${tenant.term.id}`, {
        token: login.token,
      }),
    );
    const studentsB = await getStudents(
      apiRequest(`/api/students?classroomId=${classB.id}&termId=${tenant.term.id}`, {
        token: login.token,
      }),
    );
    const studentsC = await getStudents(
      apiRequest(`/api/students?classroomId=${classC.id}&termId=${tenant.term.id}`, {
        token: login.token,
      }),
    );
    expect(studentsA.status).toBe(200);
    expect(JSON.stringify(await studentsA.json())).toContain(tenant.student.studentNumber);
    expect(studentsB.status).toBe(200);
    expect(JSON.stringify(await studentsB.json())).toContain(studentB.studentNumber);
    expect(studentsC.status).toBe(403);

    const createSession = (classroomId: string, day: string) =>
      prisma.classSession.create({
        data: {
          schoolId: tenant.school.id,
          termId: tenant.term.id,
          teacherId: tenant.teacher.id,
          classroomId,
          subjectId: tenant.subject.id,
          scheduledStart: new Date(`2026-10-${day}T01:00:00.000Z`),
          scheduledEnd: new Date(`2026-10-${day}T01:50:00.000Z`),
        },
      });
    const [sessionA, sessionB, sessionC] = await Promise.all([
      createSession(tenant.classroom.id, "01"),
      createSession(classB.id, "02"),
      createSession(classC.id, "03"),
    ]);
    expect(
      (await getSession(apiRequest(`/api/sessions/${sessionA.id}`, { token: login.token }), {
        params: Promise.resolve({ id: sessionA.id }),
      })).status,
    ).toBe(200);
    expect(
      (await getSession(apiRequest(`/api/sessions/${sessionB.id}`, { token: login.token }), {
        params: Promise.resolve({ id: sessionB.id }),
      })).status,
    ).toBe(200);
    expect(
      (await getSession(apiRequest(`/api/sessions/${sessionC.id}`, { token: login.token }), {
        params: Promise.resolve({ id: sessionC.id }),
      })).status,
    ).toBe(403);
    expect(
      (await getSession(apiRequest(`/api/sessions/${otherTenant.school.id}`, { token: login.token }), {
        params: Promise.resolve({ id: otherTenant.school.id }),
      })).status,
    ).toBe(403);

    const attendanceWrongClass = await putAttendance(
      apiRequest(`/api/sessions/${sessionA.id}/attendance`, {
        token: login.token,
        method: "PUT",
        json: {
          classroomId: classB.id,
          records: [{ studentId: tenant.student.id, status: "present" }],
        },
      }),
      { params: Promise.resolve({ id: sessionA.id }) },
    );
    expect(attendanceWrongClass.status).toBe(403);
    const attendanceQueryWrongClass = await getAttendance(
      apiRequest(
        `/api/sessions/${sessionA.id}/attendance?classroomId=${classB.id}`,
        { token: login.token },
      ),
      { params: Promise.resolve({ id: sessionA.id }) },
    );
    expect(attendanceQueryWrongClass.status).toBe(403);
    const attendanceB = await putAttendance(
      apiRequest(`/api/sessions/${sessionB.id}/attendance`, {
        token: login.token,
        method: "PUT",
        json: {
          classroomId: classB.id,
          records: [{ studentId: studentB.id, status: "present" }],
        },
      }),
      { params: Promise.resolve({ id: sessionB.id }) },
    );
    expect(attendanceB.status).toBe(200);

    const assessmentA = await prisma.assessment.create({
      data: {
        schoolId: tenant.school.id,
        termId: tenant.term.id,
        classroomId: tenant.classroom.id,
        subjectId: tenant.subject.id,
        teacherId: tenant.teacher.id,
        title: "Synthetic assessment A",
        type: "quiz",
        maxScore: 10,
      },
    });
    const scoreWrongClass = await putScores(
      apiRequest(`/api/assessments/${assessmentA.id}/scores`, {
        token: login.token,
        method: "PUT",
        json: {
          classroomId: classB.id,
          scores: [{ studentId: tenant.student.id, value: 8 }],
        },
      }),
      { params: Promise.resolve({ id: assessmentA.id }) },
    );
    expect(scoreWrongClass.status).toBe(403);
  });

  it("keeps owner/admin access school-wide and derives tenant scope from the session", async () => {
    const tenant = await createSyntheticTenant(prisma, trackedSchoolIds, "api-managers");
    const other = await createSyntheticTenant(prisma, trackedSchoolIds, "api-managers-other");
    const passwordHash = await hashPassword("Synthetic!Manager2026");
    const [owner, admin] = await Promise.all(
      (["SCHOOL_OWNER", "ADMIN"] as const).map((role) =>
        prisma.user.create({
          data: {
            schoolId: tenant.school.id,
            email: `${role.toLowerCase()}-${randomUUID()}@example.invalid`,
            firstName: "Synthetic",
            lastName: role,
            role,
            passwordHash,
          },
        }),
      ),
    );
    await prisma.user.update({
      where: { id: tenant.user.id },
      data: { passwordHash },
    });
    const [ownerLogin, adminLogin] = await Promise.all([
      authenticateWithPassword({ email: owner.email, password: "Synthetic!Manager2026" }),
      authenticateWithPassword({ email: admin.email, password: "Synthetic!Manager2026" }),
    ]);
    for (const token of [ownerLogin.token, adminLogin.token]) {
      expect((await getStaff(apiRequest("/api/staff", { token }))).status).toBe(200);
      expect((await getStudents(apiRequest("/api/students", { token }))).status).toBe(200);
    }
    const teacherLogin = await authenticateWithPassword({
      email: tenant.user.email,
      password: "Synthetic!Manager2026",
    });
    expect((await getStaff(apiRequest("/api/staff", { token: teacherLogin.token }))).status).toBe(403);

    const created = await postStudent(
      apiRequest("/api/students", {
        token: adminLogin.token,
        method: "POST",
        json: {
          schoolId: other.school.id,
          userId: other.user.id,
          role: "SCHOOL_OWNER",
          teacherId: other.teacher.id,
          studentNumber: `TRUSTED-${randomUUID()}`,
          firstName: "Synthetic",
          lastName: "Trusted Scope",
        },
      }),
    );
    expect(created.status).toBe(201);
    await expect(created.json()).resolves.toMatchObject({
      data: { schoolId: tenant.school.id },
    });

    const malformed = await postStudent(
      apiRequest("/api/students", {
        token: adminLogin.token,
        method: "POST",
        rawBody: "{",
      }),
    );
    expect(malformed.status).toBe(400);
    const wrongOrigin = await postStudent(
      apiRequest("/api/students", {
        token: adminLogin.token,
        method: "POST",
        origin: "https://attacker.invalid",
        json: { studentNumber: "X", firstName: "X", lastName: "X" },
      }),
    );
    expect(wrongOrigin.status).toBe(403);
  });
});
