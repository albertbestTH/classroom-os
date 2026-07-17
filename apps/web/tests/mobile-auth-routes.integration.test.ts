import { createHash, randomUUID } from "node:crypto";

import { hashPassword } from "@classroom-os/database";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { POST as mobileLogin } from "@/app/api/mobile/auth/login/route";
import { POST as mobileLogout } from "@/app/api/mobile/auth/logout/route";
import { GET as mobileSession } from "@/app/api/mobile/auth/session/route";
import { GET as getToday } from "@/app/api/me/today/route";
import { createPrismaClient, disconnectPrisma } from "../../../packages/database/src/client.js";
import type { PrismaClient } from "../../../packages/database/src/generated/prisma/client.js";
import { cleanupSyntheticSchools, requireSafeIntegrationDatabaseUrl } from "../../../packages/database/tests/helpers/database.js";
import { createSyntheticTenant } from "../../../packages/database/tests/helpers/factories.js";

function request(path: string, options: { token?: string; json?: unknown; method?: string } = {}) {
  const headers = new Headers({ "content-type": "application/json" });
  if (options.token) headers.set("authorization", `Bearer ${options.token}`);
  return new NextRequest(`http://localhost${path}`, { method: options.method ?? "GET", headers, body: options.json === undefined ? undefined : JSON.stringify(options.json) });
}

describe("mobile bearer authentication", () => {
  const schoolIds = new Set<string>(); let prisma: PrismaClient;
  beforeAll(() => { prisma = createPrismaClient(requireSafeIntegrationDatabaseUrl()); });
  afterEach(async () => { await cleanupSyntheticSchools(prisma, schoolIds); schoolIds.clear(); });
  afterAll(async () => { await cleanupSyntheticSchools(prisma, schoolIds); await disconnectPrisma(); await prisma.$disconnect(); });

  it("logs in a teacher, stores only the token hash, resolves bearer access, and revokes logout", async () => {
    const tenant = await createSyntheticTenant(prisma, schoolIds, "mobile-auth"); const password = "Synthetic!Mobile2026";
    await prisma.user.update({ where: { id: tenant.user.id }, data: { passwordHash: await hashPassword(password) } });
    const response = await mobileLogin(request("/api/mobile/auth/login", { method: "POST", json: { email: tenant.user.email.toUpperCase(), password } }));
    expect(response.status).toBe(200); const payload = await response.json() as { data: { token: string; user: { role: string; schoolId: string } } };
    expect(payload.data.user.role).toBe("TEACHER"); expect(payload.data.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const row = await prisma.authSession.findUnique({ where: { tokenHash: createHash("sha256").update(payload.data.token).digest("hex") } });
    expect(row).not.toBeNull(); expect(JSON.stringify(row)).not.toContain(payload.data.token);
    expect((await mobileSession(request("/api/mobile/auth/session", { token: payload.data.token }))).status).toBe(200);
    expect((await getToday(request("/api/me/today", { token: payload.data.token }))).status).toBe(200);
    expect((await mobileLogout(request("/api/mobile/auth/logout", { method: "POST", token: payload.data.token }))).status).toBe(200);
    expect((await mobileSession(request("/api/mobile/auth/session", { token: payload.data.token }))).status).toBe(401);
  });

  it("uses safe credential errors and rejects disabled and manager accounts", async () => {
    const tenant = await createSyntheticTenant(prisma, schoolIds, "mobile-denials"); const password = "Synthetic!Mobile2026"; const passwordHash = await hashPassword(password);
    await prisma.user.update({ where: { id: tenant.user.id }, data: { passwordHash } });
    expect((await mobileLogin(request("/api/mobile/auth/login", { method: "POST", json: { email: `unknown-${randomUUID()}@example.invalid`, password } }))).status).toBe(401);
    expect((await mobileLogin(request("/api/mobile/auth/login", { method: "POST", json: { email: tenant.user.email, password: "Wrong!Password9" } }))).status).toBe(401);
    const owner = await prisma.user.create({ data: { schoolId: tenant.school.id, email: `owner-${randomUUID()}@example.invalid`, firstName: "Synthetic", lastName: "Owner", role: "SCHOOL_OWNER", passwordHash } });
    const ownerResponse = await mobileLogin(request("/api/mobile/auth/login", { method: "POST", json: { email: owner.email, password } }));
    expect(ownerResponse.status).toBe(403); expect(await prisma.authSession.count({ where: { userId: owner.id, revokedAt: null } })).toBe(0);
    await prisma.user.update({ where: { id: tenant.user.id }, data: { status: "DISABLED" } });
    expect((await mobileLogin(request("/api/mobile/auth/login", { method: "POST", json: { email: tenant.user.email, password } }))).status).toBe(403);
    const events = await prisma.authenticationEvent.findMany({ where: { OR: [{ userId: tenant.user.id }, { userId: owner.id }] } });
    expect(JSON.stringify(events)).not.toContain(password); expect(JSON.stringify(events)).not.toContain("token");
  });
});
