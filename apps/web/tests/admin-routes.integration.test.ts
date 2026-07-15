import { randomUUID } from "node:crypto";

import { authenticateWithPassword, hashPassword, resolveServerSession } from "@classroom-os/database";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { GET as getAcademicYears, POST as postAcademicYear } from "@/app/api/academic-years/route";
import { PATCH as patchClassroom } from "@/app/api/classrooms/[id]/route";
import { POST as postClassroom } from "@/app/api/classrooms/route";
import { PATCH as patchStaffStatus } from "@/app/api/staff/[id]/status/route";
import { GET as getStaff, POST as postStaff } from "@/app/api/staff/route";
import { PATCH as patchSubject } from "@/app/api/subjects/[id]/route";
import { GET as getSubjects, POST as postSubject } from "@/app/api/subjects/route";
import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";
import { createPrismaClient, disconnectPrisma } from "../../../packages/database/src/client.js";
import type { PrismaClient } from "../../../packages/database/src/generated/prisma/client.js";
import { cleanupSyntheticSchools, requireSafeIntegrationDatabaseUrl } from "../../../packages/database/tests/helpers/database.js";
import { createSyntheticTenant } from "../../../packages/database/tests/helpers/factories.js";

function request(path: string, options: { token?: string; method?: string; json?: unknown; rawBody?: string } = {}) {
  const headers = new Headers();
  if (options.token) headers.set("cookie", `${AUTH_COOKIE_NAME}=${options.token}`);
  if (options.json !== undefined || options.rawBody !== undefined) headers.set("content-type", "application/json");
  if (options.method && options.method !== "GET") headers.set("origin", "http://localhost");
  return new NextRequest(`http://localhost${path}`, { method: options.method ?? "GET", headers, body: options.rawBody ?? (options.json === undefined ? undefined : JSON.stringify(options.json)) });
}

describe("admin console API routes", () => {
  const trackedSchoolIds = new Set<string>(); let prisma: PrismaClient;
  beforeAll(() => { prisma = createPrismaClient(requireSafeIntegrationDatabaseUrl()); });
  afterEach(async () => { await cleanupSyntheticSchools(prisma, trackedSchoolIds); trackedSchoolIds.clear(); });
  afterAll(async () => { await cleanupSyntheticSchools(prisma, trackedSchoolIds); await disconnectPrisma(); await prisma.$disconnect(); });

  async function setupManagers() {
    const tenant = await createSyntheticTenant(prisma, trackedSchoolIds, "admin-api");
    const password = "Synthetic!Routes2026"; const passwordHash = await hashPassword(password);
    await prisma.user.update({ where: { id: tenant.user.id }, data: { passwordHash } });
    const [owner, admin] = await Promise.all(([
      "SCHOOL_OWNER", "ADMIN",
    ] as const).map((role) => prisma.user.create({ data: { schoolId: tenant.school.id, email: `${role.toLowerCase()}-${randomUUID()}@example.invalid`, firstName: "Synthetic", lastName: role, role, passwordHash } })));
    const [ownerLogin, adminLogin, teacherLogin] = await Promise.all([owner, admin, tenant.user].map((user) => authenticateWithPassword({ email: user.email, password })));
    return { tenant, owner, admin, ownerToken: ownerLogin.token, adminToken: adminLogin.token, teacherToken: teacherLogin.token };
  }

  it("enforces owner, admin, and teacher access and staff validation", async () => {
    const { ownerToken, adminToken, teacherToken } = await setupManagers();
    expect((await getStaff(request("/api/staff", { token: teacherToken }))).status).toBe(403);
    expect((await getSubjects(request("/api/subjects", { token: teacherToken }))).status).toBe(403);
    expect((await getAcademicYears(request("/api/academic-years", { token: teacherToken }))).status).toBe(403);
    for (const token of [ownerToken, adminToken]) {
      expect((await getStaff(request("/api/staff", { token }))).status).toBe(200);
      expect((await getSubjects(request("/api/subjects", { token }))).status).toBe(200);
    }

    const invalid = await postStaff(request("/api/staff", { token: adminToken, method: "POST", json: { firstName: "", lastName: "Test", email: "bad", role: "TEACHER", temporaryPassword: "weak" } }));
    expect(invalid.status).toBe(400);
    const adminCreatesOwner = await postStaff(request("/api/staff", { token: adminToken, method: "POST", json: { firstName: "Synthetic", lastName: "Owner", email: `blocked-${randomUUID()}@example.invalid`, role: "SCHOOL_OWNER", temporaryPassword: "Synthetic!OwnerRoute2026" } }));
    expect(adminCreatesOwner.status).toBe(403);
    const ownerCreatesOwner = await postStaff(request("/api/staff", { token: ownerToken, method: "POST", json: { firstName: "Synthetic", lastName: "Owner Two", email: `owner-${randomUUID()}@example.invalid`, role: "SCHOOL_OWNER", temporaryPassword: "Synthetic!OwnerRoute2026" } }));
    expect(ownerCreatesOwner.status).toBe(201);
  });

  it("derives classroom and subject tenants from the session and blocks cross-school edits", async () => {
    const { tenant, adminToken } = await setupManagers();
    const other = await createSyntheticTenant(prisma, trackedSchoolIds, "admin-api-other");
    const subjectResponse = await postSubject(request("/api/subjects", { token: adminToken, method: "POST", json: { schoolId: other.school.id, actorUserId: other.user.id, code: `API-${randomUUID()}`, name: "Synthetic API subject" } }));
    expect(subjectResponse.status).toBe(201);
    await expect(subjectResponse.json()).resolves.toMatchObject({ data: { schoolId: tenant.school.id } });
    const classroomResponse = await postClassroom(request("/api/classrooms", { token: adminToken, method: "POST", json: { schoolId: other.school.id, code: `API-${randomUUID()}`, name: "Synthetic API room", gradeLevel: "TEST-6" } }));
    expect(classroomResponse.status).toBe(201);
    await expect(classroomResponse.json()).resolves.toMatchObject({ data: { schoolId: tenant.school.id } });

    expect((await patchSubject(request(`/api/subjects/${other.subject.id}`, { token: adminToken, method: "PATCH", json: { name: "Cross tenant" } }), { params: Promise.resolve({ id: other.subject.id }) })).status).toBe(404);
    expect((await patchClassroom(request(`/api/classrooms/${other.classroom.id}`, { token: adminToken, method: "PATCH", json: { name: "Cross tenant" } }), { params: Promise.resolve({ id: other.classroom.id }) })).status).toBe(404);
  });

  it("revokes a staff session through the disable-account route", async () => {
    const { adminToken } = await setupManagers();
    const email = `disable-route-${randomUUID()}@example.invalid`; const password = "Synthetic!DisableRoute2026";
    const created = await postStaff(request("/api/staff", { token: adminToken, method: "POST", json: { firstName: "Synthetic", lastName: "Disabled", email, role: "ADMIN", temporaryPassword: password } }));
    const payload = await created.json() as { data: { id: string } };
    const login = await authenticateWithPassword({ email, password });
    const disabled = await patchStaffStatus(request(`/api/staff/${payload.data.id}/status`, { token: adminToken, method: "PATCH", json: { status: "DISABLED" } }), { params: Promise.resolve({ id: payload.data.id }) });
    expect(disabled.status).toBe(200);
    await expect(resolveServerSession(login.token)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("rejects malformed and invalid academic-year input", async () => {
    const { adminToken } = await setupManagers();
    expect((await postAcademicYear(request("/api/academic-years", { token: adminToken, method: "POST", rawBody: "{" }))).status).toBe(400);
    const invalidDates = await postAcademicYear(request("/api/academic-years", { token: adminToken, method: "POST", json: { name: "Invalid", startsOn: "2028-01-01", endsOn: "2027-01-01" } }));
    expect(invalidDates.status).toBe(400);
  });
});
