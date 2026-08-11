import { authenticateWithPassword, hashPassword } from "@classroom-os/database";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { GET as getGradebook, POST as createAssessment } from "@/app/api/assessments/route";
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

  it("resolves one Quick Assessment and synchronizes scores in both directions", async () => {
    const tenant = await createSyntheticTenant(prisma, schoolIds, "gradebook-sync");
    const password = "Synthetic!Gradebook2026";
    await prisma.user.update({ where: { id: tenant.user.id }, data: { passwordHash: await hashPassword(password) } });
    await prisma.classEnrollment.create({ data: {
      schoolId: tenant.school.id, termId: tenant.term.id,
      classroomId: tenant.classroom.id, studentId: tenant.student.id,
    } });
    const session = await prisma.classSession.create({ data: {
      schoolId: tenant.school.id, termId: tenant.term.id,
      timetableEntryId: tenant.timetableEntry.id,
      teachingAssignmentId: tenant.teachingAssignment.id,
      classroomId: tenant.classroom.id, subjectId: tenant.subject.id, teacherId: tenant.teacher.id,
      scheduledStart: new Date("2026-08-24T01:00:00.000Z"),
      scheduledEnd: new Date("2026-08-24T01:50:00.000Z"),
    } });
    const web = await authenticateWithPassword({ email: tenant.user.email, password });
    const mobileResponse = await mobileLogin(request("/api/mobile/auth/login", { method: "POST", json: { email: tenant.user.email, password } }));
    const mobile = await mobileResponse.json() as { data: { token: string } };

    const assessmentInput = {
      teachingAssignmentId: tenant.teachingAssignment.id,
      classSessionId: session.id,
      title: "Synthetic Quick Score",
      type: "participation",
      maxScore: 10,
    };
    const unauthenticated = await createAssessment(request("/api/assessments", { method: "POST", json: assessmentInput }));
    expect(unauthenticated.status).toBe(401);
    const [webResolve, mobileResolve] = await Promise.all([
      createAssessment(request("/api/assessments", { cookie: web.token, method: "POST", json: assessmentInput })),
      createAssessment(request("/api/assessments", { bearer: mobile.data.token, method: "POST", json: assessmentInput })),
    ]);
    expect(webResolve.status).toBe(201);
    expect(mobileResolve.status).toBe(201);
    const webAssessment = await webResolve.json() as { data: { id: string } };
    const mobileAssessment = await mobileResolve.json() as { data: { id: string } };
    expect(mobileAssessment.data.id).toBe(webAssessment.data.id);
    const assessmentId = webAssessment.data.id;

    const update = await putScores(request(`/api/assessments/${assessmentId}/scores`, {
      bearer: mobile.data.token, method: "PUT",
      json: { classroomId: tenant.classroom.id, scores: [{ studentId: tenant.student.id, value: 8 }] },
    }), { params: Promise.resolve({ id: assessmentId }) });
    expect(update.status).toBe(200);

    const exactGradebookPath = `/api/assessments?teachingAssignmentId=${tenant.teachingAssignment.id}&classSessionId=${session.id}`;
    const webView = await getGradebook(request(exactGradebookPath, { cookie: web.token }));
    expect(webView.status).toBe(200);
    const webPayload = await webView.json();
    expect(webPayload).toMatchObject({ data: { students: [{ studentId: tenant.student.id, scores: [{ assessmentId, value: 8 }] }] } });

    const webUpdate = await putScores(request(`/api/assessments/${assessmentId}/scores`, {
      cookie: web.token, method: "PUT",
      json: { classroomId: tenant.classroom.id, scores: [{ studentId: tenant.student.id, value: 9.5 }] },
    }), { params: Promise.resolve({ id: assessmentId }) });
    expect(webUpdate.status).toBe(200);

    const mobileView = await getGradebook(request(exactGradebookPath, { bearer: mobile.data.token }));
    expect(mobileView.status).toBe(200);
    const mobilePayload = await mobileView.json();
    expect(mobilePayload).toMatchObject({ data: { students: [{ studentId: tenant.student.id, scores: [{ assessmentId, value: 9.5 }] }] } });
    expect(await prisma.assessment.count({ where: { schoolId: tenant.school.id, classSessionId: session.id } })).toBe(1);
    expect(await prisma.score.count({ where: { assessmentId, studentId: tenant.student.id } })).toBe(1);
  });
});
