import { authenticateWithPassword, hashPassword } from "@classroom-os/database";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { GET as getGradebook } from "@/app/api/assessments/route";
import { PUT as putScores } from "@/app/api/assessments/[id]/scores/route";
import { POST as mobileLogin } from "@/app/api/mobile/auth/login/route";
import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";
import { createPrismaClient, disconnectPrisma } from "../../../packages/database/src/client.js";
import type { PrismaClient } from "../../../packages/database/src/generated/prisma/client.js";
import { cleanupSyntheticSchools, requireSafeIntegrationDatabaseUrl } from "../../../packages/database/tests/helpers/database.js";
import { createSyntheticTenant } from "../../../packages/database/tests/helpers/factories.js";

function request(path: string, options: { cookie?: string; bearer?: string; method?: string; json?: unknown } = {}) {
  const headers = new Headers();
  if (options.cookie) headers.set("cookie", `${AUTH_COOKIE_NAME}=${options.cookie}`);
  if (options.bearer) headers.set("authorization", `Bearer ${options.bearer}`);
  if (options.json !== undefined) headers.set("content-type", "application/json");
  if (options.cookie && options.method && options.method !== "GET") headers.set("origin", "http://localhost");
  return new NextRequest(`http://localhost${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.json === undefined ? undefined : JSON.stringify(options.json),
  });
}

describe("mobile and web gradebook synchronization", () => {
  const schoolIds = new Set<string>();
  let prisma: PrismaClient;
  beforeAll(() => { prisma = createPrismaClient(requireSafeIntegrationDatabaseUrl()); });
  afterEach(async () => { await cleanupSyntheticSchools(prisma, schoolIds); schoolIds.clear(); });
  afterAll(async () => { await cleanupSyntheticSchools(prisma, schoolIds); await disconnectPrisma(); await prisma.$disconnect(); });

  it("shows a mobile score update in the web gradebook without duplicating data", async () => {
    const tenant = await createSyntheticTenant(prisma, schoolIds, "gradebook-sync");
    const password = "Synthetic!Gradebook2026";
    await prisma.user.update({ where: { id: tenant.user.id }, data: { passwordHash: await hashPassword(password) } });
    await prisma.classEnrollment.create({ data: {
      schoolId: tenant.school.id, termId: tenant.term.id,
      classroomId: tenant.classroom.id, studentId: tenant.student.id,
    } });
    const assessment = await prisma.assessment.create({ data: {
      schoolId: tenant.school.id, termId: tenant.term.id,
      classroomId: tenant.classroom.id, subjectId: tenant.subject.id,
      teacherId: tenant.teacher.id, title: "Synthetic participation", type: "participation", maxScore: 10,
    } });
    const web = await authenticateWithPassword({ email: tenant.user.email, password });
    const mobileResponse = await mobileLogin(request("/api/mobile/auth/login", { method: "POST", json: { email: tenant.user.email, password } }));
    const mobile = await mobileResponse.json() as { data: { token: string } };

    const update = await putScores(request(`/api/assessments/${assessment.id}/scores`, {
      bearer: mobile.data.token, method: "PUT",
      json: { classroomId: tenant.classroom.id, scores: [{ studentId: tenant.student.id, value: 8 }] },
    }), { params: Promise.resolve({ id: assessment.id }) });
    expect(update.status).toBe(200);

    const webView = await getGradebook(request(`/api/assessments?teachingAssignmentId=${tenant.teachingAssignment.id}`, { cookie: web.token }));
    const mobileView = await getGradebook(request(`/api/assessments?teachingAssignmentId=${tenant.teachingAssignment.id}`, { bearer: mobile.data.token }));
    expect(webView.status).toBe(200); expect(mobileView.status).toBe(200);
    const webPayload = await webView.json();
    const mobilePayload = await mobileView.json();
    expect(webPayload).toEqual(mobilePayload);
    expect(webPayload).toMatchObject({ data: { students: [{ studentId: tenant.student.id, scores: [{ assessmentId: assessment.id, value: 8 }] }] } });
    expect(await prisma.score.count({ where: { assessmentId: assessment.id, studentId: tenant.student.id } })).toBe(1);
  });
});
