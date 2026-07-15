import { randomUUID } from "node:crypto";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  createAssessment,
  createClassSession,
  createStudent,
  createTimetableEntry,
  endClassSession,
  getStudent,
  startClassSession,
  updateAttendanceBatch,
  updateScoreBatch,
  type DomainError,
} from "../../src/index.js";
import { createPrismaClient, disconnectPrisma } from "../../src/client.js";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import {
  cleanupSyntheticSchools,
  requireSafeIntegrationDatabaseUrl,
} from "../helpers/database.js";
import { createSyntheticTenant } from "../helpers/factories.js";

function expectDomainCode(error: unknown, code: DomainError["code"]): boolean {
  expect(error).toMatchObject({ code });
  return true;
}

describe("tenant application services", () => {
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
    await disconnectPrisma();
    await prisma.$disconnect();
  });

  it("preserves tenant isolation and stable domain error codes", async () => {
    const tenantA = await createSyntheticTenant(prisma, trackedSchoolIds, "service-a");
    const tenantB = await createSyntheticTenant(prisma, trackedSchoolIds, "service-b");

    await expect(
      getStudent({ schoolId: tenantB.school.id, studentId: tenantA.student.id }),
    ).rejects.toSatisfy((error) => expectDomainCode(error, "NOT_FOUND"));
    await expect(
      getStudent({ schoolId: "", studentId: tenantA.student.id }),
    ).rejects.toSatisfy((error) => expectDomainCode(error, "TENANT_ACCESS_DENIED"));
  });

  it("enforces scheduled to live to completed session transitions", async () => {
    const tenant = await createSyntheticTenant(prisma, trackedSchoolIds, "transitions");
    const session = await createClassSession({
      schoolId: tenant.school.id,
      actorUserId: tenant.user.id,
      timetableEntryId: tenant.timetableEntry.id,
      scheduledStart: "2026-08-03T01:00:00.000Z",
      scheduledEnd: "2026-08-03T01:50:00.000Z",
    });

    const live = await startClassSession({
      schoolId: tenant.school.id,
      actorUserId: tenant.user.id,
      sessionId: session.id,
      startedAt: "2026-08-03T01:01:00.000Z",
    });
    expect(live.status).toBe("live");
    await expect(
      startClassSession({ schoolId: tenant.school.id, sessionId: session.id }),
    ).rejects.toSatisfy((error) =>
      expectDomainCode(error, "INVALID_STATE_TRANSITION"),
    );

    const completed = await endClassSession({
      schoolId: tenant.school.id,
      actorUserId: tenant.user.id,
      sessionId: session.id,
      endedAt: "2026-08-03T01:45:00.000Z",
    });
    expect(completed.status).toBe("completed");
    await expect(
      endClassSession({ schoolId: tenant.school.id, sessionId: session.id }),
    ).rejects.toSatisfy((error) =>
      expectDomainCode(error, "INVALID_STATE_TRANSITION"),
    );
  });

  it("allows attendance only for enrolled students and blocks completed edits", async () => {
    const tenant = await createSyntheticTenant(prisma, trackedSchoolIds, "attendance-service");
    const session = await createClassSession({
      schoolId: tenant.school.id,
      timetableEntryId: tenant.timetableEntry.id,
      scheduledStart: "2026-08-10T01:00:00.000Z",
      scheduledEnd: "2026-08-10T01:50:00.000Z",
    });
    const input = {
      schoolId: tenant.school.id,
      actorUserId: tenant.user.id,
      sessionId: session.id,
      records: [{ studentId: tenant.student.id, status: "present" as const }],
    };

    await expect(updateAttendanceBatch(input)).rejects.toSatisfy((error) =>
      expectDomainCode(error, "VALIDATION_ERROR"),
    );
    await prisma.classEnrollment.create({
      data: {
        schoolId: tenant.school.id,
        termId: tenant.term.id,
        classroomId: tenant.classroom.id,
        studentId: tenant.student.id,
      },
    });
    expect((await updateAttendanceBatch(input)).count).toBe(1);

    await startClassSession({ schoolId: tenant.school.id, sessionId: session.id });
    await endClassSession({ schoolId: tenant.school.id, sessionId: session.id });
    await expect(updateAttendanceBatch(input)).rejects.toSatisfy((error) =>
      expectDomainCode(error, "INVALID_STATE_TRANSITION"),
    );
  });

  it("enforces score enrollment and assessment maximums", async () => {
    const tenant = await createSyntheticTenant(prisma, trackedSchoolIds, "score-service");
    const assessment = await createAssessment({
      schoolId: tenant.school.id,
      actorUserId: tenant.user.id,
      termId: tenant.term.id,
      classroomId: tenant.classroom.id,
      subjectId: tenant.subject.id,
      teacherId: tenant.teacher.id,
      title: "Synthetic service quiz",
      type: "quiz",
      maxScore: 10,
    });

    const base = {
      schoolId: tenant.school.id,
      assessmentId: assessment.id,
      gradedById: tenant.teacher.id,
    };
    await expect(
      updateScoreBatch({
        ...base,
        scores: [{ studentId: tenant.student.id, value: 8 }],
      }),
    ).rejects.toSatisfy((error) => expectDomainCode(error, "VALIDATION_ERROR"));

    await prisma.classEnrollment.create({
      data: {
        schoolId: tenant.school.id,
        termId: tenant.term.id,
        classroomId: tenant.classroom.id,
        studentId: tenant.student.id,
      },
    });
    await expect(
      updateScoreBatch({
        ...base,
        scores: [{ studentId: tenant.student.id, value: 11 }],
      }),
    ).rejects.toSatisfy((error) => expectDomainCode(error, "VALIDATION_ERROR"));
    expect(
      (
        await updateScoreBatch({
          ...base,
          scores: [{ studentId: tenant.student.id, value: 9 }],
        })
      ).records[0]?.value,
    ).toBe(9);
  });

  it("detects teacher and classroom timetable overlaps", async () => {
    const tenant = await createSyntheticTenant(prisma, trackedSchoolIds, "overlap");
    const token = randomUUID().slice(0, 8);
    const otherTeacher = await prisma.teacher.create({
      data: {
        schoolId: tenant.school.id,
        employeeCode: `T2-${token}`,
        firstName: "Synthetic",
        lastName: "Second Teacher",
      },
    });
    const otherClassroom = await prisma.classroom.create({
      data: {
        schoolId: tenant.school.id,
        code: `C2-${token}`,
        name: "Synthetic Second Classroom",
        gradeLevel: "TEST-5",
      },
    });
    const common = {
      schoolId: tenant.school.id,
      termId: tenant.term.id,
      subjectId: tenant.subject.id,
      weekday: 1,
      startTime: "08:30",
      endTime: "09:10",
    };

    await expect(
      createTimetableEntry({
        ...common,
        teacherId: tenant.teacher.id,
        classroomId: otherClassroom.id,
      }),
    ).rejects.toSatisfy((error) => expectDomainCode(error, "CONFLICT"));
    await expect(
      createTimetableEntry({
        ...common,
        teacherId: otherTeacher.id,
        classroomId: tenant.classroom.id,
      }),
    ).rejects.toSatisfy((error) => expectDomainCode(error, "CONFLICT"));
  });

  it("creates a sanitized audit log for service mutations", async () => {
    const tenant = await createSyntheticTenant(prisma, trackedSchoolIds, "audit");
    const student = await createStudent({
      schoolId: tenant.school.id,
      actorUserId: tenant.user.id,
      studentNumber: `SVC-${randomUUID().slice(0, 8)}`,
      firstName: "Synthetic",
      lastName: "Audited Learner",
    });
    const audit = await prisma.auditLog.findFirst({
      where: {
        schoolId: tenant.school.id,
        entityType: "Student",
        entityId: student.id,
        action: "student.created",
      },
    });

    expect(audit).toMatchObject({ actorUserId: tenant.user.id });
    expect(JSON.stringify(audit?.metadata)).not.toMatch(/password|token|secret|biometric/i);
  });
});
