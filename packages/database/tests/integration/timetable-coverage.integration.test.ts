import { randomUUID } from "node:crypto";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { createPrismaClient, disconnectPrisma } from "../../src/client.js";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { getTodayTimetable } from "../../src/services/today.service.js";
import { requestTimetableCoverage, resolveTimetableCoverage } from "../../src/services/timetable-coverage.service.js";
import { cleanupSyntheticSchools, requireSafeIntegrationDatabaseUrl } from "../helpers/database.js";
import { createSyntheticTenant } from "../helpers/factories.js";

describe("timetable coverage", () => {
  const schoolIds = new Set<string>();
  let prisma: PrismaClient;
  beforeAll(() => { prisma = createPrismaClient(requireSafeIntegrationDatabaseUrl()); });
  afterEach(async () => { await cleanupSyntheticSchools(prisma, schoolIds); schoolIds.clear(); });
  afterAll(async () => { await cleanupSyntheticSchools(prisma, schoolIds); await disconnectPrisma(); await prisma.$disconnect(); });

  it("gives an approved substitute the original class without changing ownership", async () => {
    const tenant = await createSyntheticTenant(prisma, schoolIds, "coverage");
    const substituteUser = await prisma.user.create({ data: {
      schoolId: tenant.school.id, email: `sub-${randomUUID()}@example.invalid`,
      firstName: "Synthetic", lastName: "Substitute", role: "TEACHER",
    } });
    const substitute = await prisma.teacher.create({ data: {
      schoolId: tenant.school.id, userId: substituteUser.id,
      employeeCode: `SUB-${randomUUID()}`, firstName: "Synthetic", lastName: "Substitute",
    } });
    const requested = await requestTimetableCoverage({
      schoolId: tenant.school.id, actorUserId: tenant.user.id,
      actorRole: "TEACHER", actorTeacherId: tenant.teacher.id,
      timetableEntryId: tenant.timetableEntry.id, substituteTeacherId: substitute.id,
      localDate: "2026-05-04", kind: "cover", reason: "Synthetic test cover",
    });
    expect(requested.status).toBe("pending");
    const approved = await resolveTimetableCoverage({
      schoolId: tenant.school.id, actorUserId: substituteUser.id,
      actorRole: "TEACHER", actorTeacherId: substitute.id,
      coverageId: requested.id, status: "active",
    });
    expect(approved.status).toBe("active");

    const today = await getTodayTimetable({
      schoolId: tenant.school.id, role: "TEACHER", teacherId: substitute.id,
      now: new Date("2026-05-04T01:00:00.000Z"),
    });
    expect(today.classes).toHaveLength(1);
    expect(today.classes[0]?.timetableEntry.id).toBe(tenant.timetableEntry.id);
    expect(today.classes[0]?.timetableEntry.teacherId).toBe(tenant.teacher.id);
    expect(today.classes[0]?.coverage?.substituteTeacherId).toBe(substitute.id);
    expect(await prisma.auditLog.count({ where: {
      schoolId: tenant.school.id, entityId: requested.id,
      action: { in: ["timetable.coverage.requested", "timetable.coverage.active"] },
    } })).toBe(2);
  });

  it("rejects a substitute from another tenant", async () => {
    const tenant = await createSyntheticTenant(prisma, schoolIds, "coverage-a");
    const other = await createSyntheticTenant(prisma, schoolIds, "coverage-b");
    await expect(requestTimetableCoverage({
      schoolId: tenant.school.id, actorUserId: tenant.user.id,
      actorRole: "TEACHER", actorTeacherId: tenant.teacher.id,
      timetableEntryId: tenant.timetableEntry.id, substituteTeacherId: other.teacher.id,
      localDate: "2026-05-04", kind: "cover",
    })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
