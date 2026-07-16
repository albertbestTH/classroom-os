import { authenticateWithPassword, hashPassword } from "@classroom-os/database";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { GET as getOverview } from "@/app/api/dashboard/overview/route";
import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";
import { createPrismaClient, disconnectPrisma } from "../../../packages/database/src/client.js";
import type { PrismaClient } from "../../../packages/database/src/generated/prisma/client.js";
import { cleanupSyntheticSchools, requireSafeIntegrationDatabaseUrl } from "../../../packages/database/tests/helpers/database.js";
import { createSyntheticTenant } from "../../../packages/database/tests/helpers/factories.js";

function request(path: string, token?: string) {
  return new NextRequest(`http://localhost${path}`, {
    headers: token ? { cookie: `${AUTH_COOKIE_NAME}=${token}` } : undefined,
  });
}

describe("dashboard overview route", () => {
  const schoolIds = new Set<string>();
  let prisma: PrismaClient;
  beforeAll(() => { prisma = createPrismaClient(requireSafeIntegrationDatabaseUrl()); });
  afterEach(async () => { await cleanupSyntheticSchools(prisma, schoolIds); schoolIds.clear(); });
  afterAll(async () => { await cleanupSyntheticSchools(prisma, schoolIds); await disconnectPrisma(); await prisma.$disconnect(); });

  it("uses authenticated scope and rejects malformed or trusted-context filters", async () => {
    const tenant = await createSyntheticTenant(prisma, schoolIds, "dashboard-api");
    const password = "Synthetic!Dashboard2026";
    await prisma.user.update({ where: { id: tenant.user.id }, data: { passwordHash: await hashPassword(password) } });
    const login = await authenticateWithPassword({ email: tenant.user.email, password });

    const response = await getOverview(request("/api/dashboard/overview", login.token));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ data: { scope: "ASSIGNED_CLASSES", days: 7, timezone: "Asia/Bangkok" } });

    for (const path of [
      "/api/dashboard/overview?days=9",
      "/api/dashboard/overview?classroomId=not-a-uuid",
      `/api/dashboard/overview?schoolId=${tenant.school.id}`,
      "/api/dashboard/overview?role=ADMIN",
      "/api/dashboard/overview?days=30",
    ]) {
      const invalid = await getOverview(request(path, login.token));
      expect([400, 403]).toContain(invalid.status);
      await expect(invalid.json()).resolves.toMatchObject({ error: { code: expect.stringMatching(/VALIDATION_ERROR|FORBIDDEN/) } });
    }
    const unauthenticated = await getOverview(request("/api/dashboard/overview"));
    expect(unauthenticated.status).toBe(401);
  });
});
