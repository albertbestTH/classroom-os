import { authenticateWithPassword, hashPassword } from "@classroom-os/database";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { GET as getToday } from "@/app/api/me/today/route";
import { POST as startSession } from "@/app/api/sessions/[id]/start/route";
import { GET as getTimeline } from "@/app/api/sessions/[id]/timeline/route";
import { POST as materialize } from "@/app/api/timetable/[id]/materialize/route";
import { PATCH as patchTimetable } from "@/app/api/timetable/[id]/route";
import { GET as getTimetable, POST as postTimetable } from "@/app/api/timetable/route";
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

describe("operational timetable routes", () => {
  const schoolIds = new Set<string>();
  let prisma: PrismaClient;
  beforeAll(() => { prisma = createPrismaClient(requireSafeIntegrationDatabaseUrl()); });
  afterEach(async () => { await cleanupSyntheticSchools(prisma, schoolIds); schoolIds.clear(); });
  afterAll(async () => { await cleanupSyntheticSchools(prisma, schoolIds); await disconnectPrisma(); await prisma.$disconnect(); });

  it("returns scoped today data and supports materialize/start/timeline envelopes", async () => {
    const tenant = await createSyntheticTenant(prisma, schoolIds, "api-operational");
    const password = "Synthetic!Operational2026";
    await prisma.user.update({ where: { id: tenant.user.id }, data: { passwordHash: await hashPassword(password) } });
    const login = await authenticateWithPassword({ email: tenant.user.email, password });
    const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const date = new Date(`${localDate}T00:00:00.000Z`);
    const weekday = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
    await prisma.timetableEntry.update({ where: { id: tenant.timetableEntry.id }, data: { weekday } });

    const timetableResponse = await getTimetable(request("/api/timetable", login.token));
    expect(timetableResponse.status).toBe(200);
    await expect(timetableResponse.json()).resolves.toMatchObject({ data: [{ teachingAssignmentId: tenant.teachingAssignment.id }] });

    const todayResponse = await getToday(request("/api/me/today", login.token));
    expect(todayResponse.status).toBe(200);
    await expect(todayResponse.json()).resolves.toMatchObject({ data: { localDate, classes: [{ timetableEntry: { id: tenant.timetableEntry.id } }] } });

    const route = { params: Promise.resolve({ id: tenant.timetableEntry.id }) };
    const created = await materialize(request(`/api/timetable/${tenant.timetableEntry.id}/materialize`, login.token, "POST", { localDate }), route);
    expect(created.status).toBe(201);
    const payload = await created.json() as { data: { id: string } };
    const duplicate = await materialize(request(`/api/timetable/${tenant.timetableEntry.id}/materialize`, login.token, "POST", { localDate }), route);
    expect(duplicate.status).toBe(201);
    await expect(duplicate.json()).resolves.toMatchObject({ data: { id: payload.data.id } });
    const early = await startSession(request(`/api/sessions/${payload.data.id}/start`, login.token, "POST", { startedAt: "2099-01-01T00:00:00.000Z" }), { params: Promise.resolve({ id: payload.data.id }) });
    expect(early.status).toBe(409);
    await expect(early.json()).resolves.toMatchObject({ error: { code: "INVALID_STATE_TRANSITION" } });
    const routeNow = new Date();
    await prisma.classSession.update({
      where: { id: payload.data.id },
      data: {
        scheduledStart: new Date(routeNow.getTime() - 60_000),
        scheduledEnd: new Date(routeNow.getTime() + 30 * 60_000),
      },
    });
    const live = await startSession(request(`/api/sessions/${payload.data.id}/start`, login.token, "POST", {}), { params: Promise.resolve({ id: payload.data.id }) });
    expect(live.status).toBe(200);
    await expect(live.json()).resolves.toMatchObject({ data: { status: "live", classroomId: tenant.classroom.id } });
    const timeline = await getTimeline(request(`/api/sessions/${payload.data.id}/timeline`, login.token), { params: Promise.resolve({ id: payload.data.id }) });
    await expect(timeline.json()).resolves.toMatchObject({ data: [{ eventType: "SESSION_STARTED" }] });
  });

  it("rejects malformed materialization input without leaking internals", async () => {
    const tenant = await createSyntheticTenant(prisma, schoolIds, "api-invalid-materialize");
    const password = "Synthetic!Operational2026";
    await prisma.user.update({ where: { id: tenant.user.id }, data: { passwordHash: await hashPassword(password) } });
    const login = await authenticateWithPassword({ email: tenant.user.email, password });
    const response = await materialize(request(`/api/timetable/${tenant.timetableEntry.id}/materialize`, login.token, "POST", { localDate: "not-a-date" }), { params: Promise.resolve({ id: tenant.timetableEntry.id }) });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  });

  it("creates repeated assignment slots, persists PATCH updates, and rejects cross-school edits", async () => {
    const tenant = await createSyntheticTenant(prisma, schoolIds, "api-timetable-edit");
    const other = await createSyntheticTenant(prisma, schoolIds, "api-timetable-foreign");
    const password = "Synthetic!Timetable2026";
    await prisma.user.update({ where: { id: tenant.user.id }, data: { passwordHash: await hashPassword(password) } });
    const login = await authenticateWithPassword({ email: tenant.user.email, password });
    const create = (weekday: number, startTime: string, endTime: string) => postTimetable(request("/api/timetable", login.token, "POST", { teachingAssignmentId: tenant.teachingAssignment.id, weekday, startTime, endTime, room: "SYNTHETIC" }));
    expect((await create(3, "10:30", "11:20")).status).toBe(201);
    expect((await create(5, "13:00", "13:50")).status).toBe(201);
    const listed = await getTimetable(request(`/api/timetable?termId=${tenant.term.id}`, login.token));
    const listPayload = await listed.json() as { data: Array<{ teachingAssignmentId: string }> };
    expect(listPayload.data.filter((item) => item.teachingAssignmentId === tenant.teachingAssignment.id)).toHaveLength(3);

    const update = await patchTimetable(request(`/api/timetable/${tenant.timetableEntry.id}`, login.token, "PATCH", { weekday: 4, startTime: "12:30", endTime: "13:20" }), { params: Promise.resolve({ id: tenant.timetableEntry.id }) });
    expect(update.status).toBe(200);
    await expect(update.json()).resolves.toMatchObject({ data: { id: tenant.timetableEntry.id, weekday: 4, startTime: "12:30", endTime: "13:20" } });
    await expect(prisma.timetableEntry.findUnique({ where: { id: tenant.timetableEntry.id } })).resolves.toMatchObject({ weekday: 4 });

    const forbidden = await patchTimetable(request(`/api/timetable/${other.timetableEntry.id}`, login.token, "PATCH", { weekday: 2 }), { params: Promise.resolve({ id: other.timetableEntry.id }) });
    expect(forbidden.status).toBe(403);
    await expect(forbidden.json()).resolves.toMatchObject({ error: { code: "FORBIDDEN" } });
  });
});
