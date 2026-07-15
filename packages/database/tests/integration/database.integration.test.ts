import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  createPrismaClient,
  createSessionFromTimetableForSchool,
  listClassroomsForSchool,
  listStudentsForSchool,
  Prisma,
  requireClassroomForSchool,
  requireClassSessionForSchool,
  requireStudentForSchool,
  TenantRecordNotFoundError,
  type PrismaClient,
} from "../../src/index.js";
import {
  cleanupSyntheticSchools,
  requireSafeIntegrationDatabaseUrl,
} from "../helpers/database.js";
import { createSyntheticTenant } from "../helpers/factories.js";

describe("database runtime foundation", () => {
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
    trackedSchoolIds.clear();
    await prisma.$disconnect();
  });

  it("isolates student and classroom reads by school", async () => {
    const tenantA = await createSyntheticTenant(prisma, trackedSchoolIds, "tenant-a");
    const tenantB = await createSyntheticTenant(prisma, trackedSchoolIds, "tenant-b");

    const studentsForA = await listStudentsForSchool(prisma, {
      schoolId: tenantA.school.id,
    });
    const classroomsForA = await listClassroomsForSchool(prisma, {
      schoolId: tenantA.school.id,
    });

    expect(new Set(studentsForA.map(({ id }) => id))).toEqual(
      new Set([tenantA.student.id]),
    );
    expect(new Set(classroomsForA.map(({ id }) => id))).toEqual(
      new Set([tenantA.classroom.id]),
    );
    await expect(
      requireStudentForSchool(prisma, {
        schoolId: tenantA.school.id,
        studentId: tenantB.student.id,
      }),
    ).rejects.toBeInstanceOf(TenantRecordNotFoundError);
    await expect(
      requireClassroomForSchool(prisma, {
        schoolId: tenantA.school.id,
        classroomId: tenantB.classroom.id,
      }),
    ).rejects.toBeInstanceOf(TenantRecordNotFoundError);
  });

  it("rejects duplicate enrollment in the same classroom and term", async () => {
    const tenant = await createSyntheticTenant(prisma, trackedSchoolIds, "enrollment");
    const data = {
      schoolId: tenant.school.id,
      termId: tenant.term.id,
      classroomId: tenant.classroom.id,
      studentId: tenant.student.id,
    };

    await prisma.classEnrollment.create({ data });

    await expect(prisma.classEnrollment.create({ data })).rejects.toMatchObject({
      code: "P2002",
    });
  });

  it("rejects duplicate attendance for a student and class session", async () => {
    const tenant = await createSyntheticTenant(prisma, trackedSchoolIds, "attendance");
    const session = await createSessionFromTimetableForSchool(prisma, {
      schoolId: tenant.school.id,
      timetableEntryId: tenant.timetableEntry.id,
      scheduledStart: new Date("2026-07-20T01:00:00.000Z"),
      scheduledEnd: new Date("2026-07-20T01:50:00.000Z"),
    });
    const data = {
      schoolId: tenant.school.id,
      classSessionId: session.id,
      studentId: tenant.student.id,
      recordedById: tenant.user.id,
      status: "present" as const,
    };

    await prisma.attendanceRecord.create({ data });

    await expect(prisma.attendanceRecord.create({ data })).rejects.toMatchObject({
      code: "P2002",
    });
  });

  it("rejects duplicate score for a student and assessment", async () => {
    const tenant = await createSyntheticTenant(prisma, trackedSchoolIds, "score");
    const assessment = await prisma.assessment.create({
      data: {
        schoolId: tenant.school.id,
        termId: tenant.term.id,
        classroomId: tenant.classroom.id,
        subjectId: tenant.subject.id,
        teacherId: tenant.teacher.id,
        title: "Synthetic Assessment",
        type: "quiz",
        maxScore: new Prisma.Decimal(10),
      },
    });
    const data = {
      schoolId: tenant.school.id,
      assessmentId: assessment.id,
      studentId: tenant.student.id,
      gradedById: tenant.teacher.id,
      value: new Prisma.Decimal(8),
    };

    await prisma.score.create({ data });

    await expect(prisma.score.create({ data })).rejects.toMatchObject({
      code: "P2002",
    });
  });

  it("materializes a class session from its timetable entry", async () => {
    const tenant = await createSyntheticTenant(prisma, trackedSchoolIds, "session-link");
    const session = await createSessionFromTimetableForSchool(prisma, {
      schoolId: tenant.school.id,
      timetableEntryId: tenant.timetableEntry.id,
      scheduledStart: new Date("2026-07-21T01:00:00.000Z"),
      scheduledEnd: new Date("2026-07-21T01:50:00.000Z"),
      notes: "Synthetic linked session",
    });
    const timetableEntry = await prisma.timetableEntry.findUnique({
      where: { id: tenant.timetableEntry.id },
      include: { classSessions: true },
    });

    expect(session.timetableEntryId).toBe(tenant.timetableEntry.id);
    expect(session.teacherId).toBe(tenant.teacher.id);
    expect(new Set(timetableEntry?.classSessions.map(({ id }) => id))).toContain(
      session.id,
    );
  });

  it("does not expose another school's class session", async () => {
    const tenantA = await createSyntheticTenant(prisma, trackedSchoolIds, "session-a");
    const tenantB = await createSyntheticTenant(prisma, trackedSchoolIds, "session-b");
    const sessionA = await createSessionFromTimetableForSchool(prisma, {
      schoolId: tenantA.school.id,
      timetableEntryId: tenantA.timetableEntry.id,
      scheduledStart: new Date("2026-07-22T01:00:00.000Z"),
      scheduledEnd: new Date("2026-07-22T01:50:00.000Z"),
    });

    await expect(
      requireClassSessionForSchool(prisma, {
        schoolId: tenantB.school.id,
        sessionId: sessionA.id,
      }),
    ).rejects.toBeInstanceOf(TenantRecordNotFoundError);
  });
});
