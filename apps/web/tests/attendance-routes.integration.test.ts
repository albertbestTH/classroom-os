import {
  authenticateWithPassword,
  endClassSession,
  hashPassword,
  materializeClassSession,
  startClassSession,
  updateAttendanceBatch,
} from "@classroom-os/database";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { GET as getReport } from "@/app/api/reports/attendance/route";
import { GET as exportReport } from "@/app/api/reports/attendance/export/route";
import { POST as correctAttendance } from "@/app/api/sessions/[id]/attendance/corrections/route";
import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";
import { createPrismaClient, disconnectPrisma } from "../../../packages/database/src/client.js";
import type { PrismaClient } from "../../../packages/database/src/generated/prisma/client.js";
import { cleanupSyntheticSchools, requireSafeIntegrationDatabaseUrl } from "../../../packages/database/tests/helpers/database.js";
import { createSyntheticTenant } from "../../../packages/database/tests/helpers/factories.js";

function request(path: string, token: string, method = "GET", json?: unknown) {
  const headers = new Headers({ cookie: `${AUTH_COOKIE_NAME}=${token}` });
  if (method !== "GET") {
    headers.set("origin", "http://localhost");
    headers.set("content-type", "application/json");
  }
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers,
    body: json === undefined ? undefined : JSON.stringify(json),
  });
}

describe("attendance report and correction routes", () => {
  const schoolIds = new Set<string>();
  let prisma: PrismaClient;
  beforeAll(() => { prisma = createPrismaClient(requireSafeIntegrationDatabaseUrl()); });
  afterEach(async () => { await cleanupSyntheticSchools(prisma, schoolIds); schoolIds.clear(); });
  afterAll(async () => { await cleanupSyntheticSchools(prisma, schoolIds); await disconnectPrisma(); await prisma.$disconnect(); });

  it("returns tenant-scoped reports, safe CSV, and manager-only corrections", async () => {
    const tenant = await createSyntheticTenant(prisma, schoolIds, "api-attendance-report");
    const password = "Synthetic!Attendance2026";
    await prisma.user.update({ where: { id: tenant.user.id }, data: { passwordHash: await hashPassword(password) } });
    const admin = await prisma.user.create({ data: { schoolId: tenant.school.id, email: `admin+${tenant.school.id}@example.invalid`, firstName: "Synthetic", lastName: "Admin", role: "ADMIN", passwordHash: await hashPassword(password) } });
    await prisma.classEnrollment.create({ data: { schoolId: tenant.school.id, termId: tenant.term.id, classroomId: tenant.classroom.id, studentId: tenant.student.id } });
    const session = await materializeClassSession({ schoolId: tenant.school.id, timetableEntryId: tenant.timetableEntry.id, localDate: "2026-07-20" });
    await startClassSession({ schoolId: tenant.school.id, sessionId: session.id });
    await updateAttendanceBatch({ schoolId: tenant.school.id, sessionId: session.id, records: [{ studentId: tenant.student.id, status: "present" }] });
    await endClassSession({ schoolId: tenant.school.id, sessionId: session.id });
    const record = await prisma.attendanceRecord.findUniqueOrThrow({ where: { classSessionId_studentId: { classSessionId: session.id, studentId: tenant.student.id } } });
    const teacherLogin = await authenticateWithPassword({ email: tenant.user.email, password });
    const adminLogin = await authenticateWithPassword({ email: admin.email, password });
    const query = `termId=${tenant.term.id}&from=2026-07-20&to=2026-07-20`;

    const report = await getReport(request(`/api/reports/attendance?${query}`, teacherLogin.token));
    expect(report.status).toBe(200);
    await expect(report.json()).resolves.toMatchObject({ data: { sessions: [{ sessionId: session.id }], students: [{ studentId: tenant.student.id }] } });
    const csv = await exportReport(request(`/api/reports/attendance/export?${query}`, teacherLogin.token));
    expect(csv.status).toBe(200);
    expect(csv.headers.get("content-type")).toContain("text/csv");
    expect([...new Uint8Array(await csv.arrayBuffer()).slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);

    const route = { params: Promise.resolve({ id: session.id }) };
    const denied = await correctAttendance(request(`/api/sessions/${session.id}/attendance/corrections`, teacherLogin.token, "POST", { classroomId: tenant.classroom.id, studentId: tenant.student.id, status: "late", reason: "Synthetic correction", expectedRecordUpdatedAt: record.updatedAt.toISOString() }), route);
    expect(denied.status).toBe(403);
    const corrected = await correctAttendance(request(`/api/sessions/${session.id}/attendance/corrections`, adminLogin.token, "POST", { classroomId: tenant.classroom.id, studentId: tenant.student.id, status: "late", reason: "Synthetic correction", expectedRecordUpdatedAt: record.updatedAt.toISOString() }), route);
    expect(corrected.status).toBe(200);
    await expect(corrected.json()).resolves.toMatchObject({ data: { beforeStatus: "present", afterStatus: "late" } });
  });
});
