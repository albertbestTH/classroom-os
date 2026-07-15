import { randomUUID } from "node:crypto";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  createAcademicYear,
  createSubject,
  createTerm,
  getClassroom,
  getSubject,
  listAcademicYears,
  listTerms,
  updateSubject,
} from "../../src/index.js";
import { createPrismaClient, disconnectPrisma } from "../../src/client.js";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { cleanupSyntheticSchools, requireSafeIntegrationDatabaseUrl } from "../helpers/database.js";
import { createSyntheticTenant } from "../helpers/factories.js";

describe("admin catalog and academic calendar services", () => {
  const trackedSchoolIds = new Set<string>();
  let prisma: PrismaClient;

  beforeAll(() => { prisma = createPrismaClient(requireSafeIntegrationDatabaseUrl()); });
  afterEach(async () => { await cleanupSyntheticSchools(prisma, trackedSchoolIds); trackedSchoolIds.clear(); });
  afterAll(async () => { await cleanupSyntheticSchools(prisma, trackedSchoolIds); await disconnectPrisma(); await prisma.$disconnect(); });

  it("keeps classroom and subject records inside their school boundary", async () => {
    const tenantA = await createSyntheticTenant(prisma, trackedSchoolIds, "admin-catalog-a");
    const tenantB = await createSyntheticTenant(prisma, trackedSchoolIds, "admin-catalog-b");
    const subject = await createSubject({
      schoolId: tenantA.school.id,
      actorUserId: tenantA.user.id,
      code: `NEW-${randomUUID()}`,
      name: "Synthetic subject",
    });
    await expect(getSubject({ schoolId: tenantB.school.id, subjectId: subject.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(getClassroom({ schoolId: tenantB.school.id, classroomId: tenantA.classroom.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    const updated = await updateSubject({ schoolId: tenantA.school.id, actorUserId: tenantA.user.id, subjectId: subject.id, name: "Synthetic subject updated" });
    expect(updated.name).toBe("Synthetic subject updated");
    await expect(prisma.auditLog.count({ where: { schoolId: tenantA.school.id, entityId: subject.id } })).resolves.toBe(2);
  });

  it("maintains one current year and term and validates date ranges", async () => {
    const tenant = await createSyntheticTenant(prisma, trackedSchoolIds, "admin-calendar");
    await expect(createAcademicYear({ schoolId: tenant.school.id, name: "Invalid", startsOn: "2028-04-01", endsOn: "2027-04-01" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const year = await createAcademicYear({ schoolId: tenant.school.id, actorUserId: tenant.user.id, name: `Synthetic 2027-${randomUUID()}`, startsOn: "2027-05-01", endsOn: "2028-03-31", isCurrent: true });
    expect((await listAcademicYears({ schoolId: tenant.school.id })).filter(({ isCurrent }) => isCurrent)).toHaveLength(1);
    expect((await listTerms({ schoolId: tenant.school.id })).filter(({ isCurrent }) => isCurrent)).toHaveLength(0);

    const termA = await createTerm({ schoolId: tenant.school.id, actorUserId: tenant.user.id, academicYearId: year.id, name: `Term A ${randomUUID()}`, startsOn: "2027-05-01", endsOn: "2027-09-30", isCurrent: true });
    const termB = await createTerm({ schoolId: tenant.school.id, actorUserId: tenant.user.id, academicYearId: year.id, name: `Term B ${randomUUID()}`, startsOn: "2027-10-01", endsOn: "2028-03-31", isCurrent: true });
    const currentTerms = (await listTerms({ schoolId: tenant.school.id })).filter(({ isCurrent }) => isCurrent);
    expect(currentTerms).toHaveLength(1);
    expect(currentTerms[0]?.id).toBe(termB.id);
    expect(currentTerms[0]?.id).not.toBe(termA.id);

    await expect(prisma.term.create({ data: { schoolId: tenant.school.id, academicYearId: year.id, name: `Direct ${randomUUID()}`, startsOn: new Date("2027-06-01"), endsOn: new Date("2027-07-01"), isCurrent: true } })).rejects.toBeDefined();
    await expect(prisma.auditLog.count({ where: { schoolId: tenant.school.id, action: { in: ["academic_year.created", "term.created"] } } })).resolves.toBe(3);
  });
});
