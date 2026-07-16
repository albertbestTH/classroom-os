import { randomUUID } from "node:crypto";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  endClassSession,
  getSessionAttendanceRoster,
  getTodayTimetable,
  listClassSessionTimeline,
  listTimetableEntries,
  materializeClassSession,
  startClassSession,
  updateAttendanceBatch,
  type DomainError,
} from "../../src/index.js";
import { createPrismaClient, disconnectPrisma } from "../../src/client.js";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { cleanupSyntheticSchools, requireSafeIntegrationDatabaseUrl } from "../helpers/database.js";
import { createSyntheticTenant } from "../helpers/factories.js";

function hasCode(error: unknown, code: DomainError["code"]): boolean {
  expect(error).toMatchObject({ code });
  return true;
}

describe("operational classroom workflow", () => {
  const trackedSchoolIds = new Set<string>();
  let prisma: PrismaClient;

  beforeAll(() => { prisma = createPrismaClient(requireSafeIntegrationDatabaseUrl()); });
  afterEach(async () => { await cleanupSyntheticSchools(prisma, trackedSchoolIds); trackedSchoolIds.clear(); });
  afterAll(async () => { await cleanupSyntheticSchools(prisma, trackedSchoolIds); await disconnectPrisma(); await prisma.$disconnect(); });

  it("materializes once per timetable date and preserves assignment lineage", async () => {
    const tenant = await createSyntheticTenant(prisma, trackedSchoolIds, "materialize");
    const input = {
      schoolId: tenant.school.id,
      actorUserId: tenant.user.id,
      timetableEntryId: tenant.timetableEntry.id,
      localDate: "2026-07-20",
    };
    const session = await materializeClassSession(input);
    expect(session).toMatchObject({
      status: "scheduled",
      teachingAssignmentId: tenant.teachingAssignment.id,
      classroomId: tenant.classroom.id,
      subjectId: tenant.subject.id,
      teacherId: tenant.teacher.id,
      scheduledStart: "2026-07-20T01:00:00.000Z",
    });
    const today = await getTodayTimetable({
      schoolId: tenant.school.id,
      role: "TEACHER",
      teacherId: tenant.teacher.id,
      now: new Date("2026-07-19T18:30:00.000Z"),
    });
    expect(today).toMatchObject({
      localDate: "2026-07-20",
      timezone: "Asia/Bangkok",
      classes: [{ session: { id: session.id }, timetableEntry: { classroomId: tenant.classroom.id } }],
    });
    await expect(materializeClassSession(input)).resolves.toMatchObject({ id: session.id });
  });

  it("enforces roster isolation, live overlap, timeline events, and completed read-only state", async () => {
    const tenant = await createSyntheticTenant(prisma, trackedSchoolIds, "live-isolation");
    await prisma.classEnrollment.create({
      data: { schoolId: tenant.school.id, termId: tenant.term.id, classroomId: tenant.classroom.id, studentId: tenant.student.id },
    });
    const classB = await prisma.classroom.create({
      data: { schoolId: tenant.school.id, code: `B-${randomUUID()}`, name: "Synthetic class B", gradeLevel: "TEST-5" },
    });
    const studentB = await prisma.student.create({
      data: { schoolId: tenant.school.id, studentNumber: `B-${randomUUID()}`, firstName: "Student", lastName: "B" },
    });
    await prisma.classEnrollment.create({
      data: { schoolId: tenant.school.id, termId: tenant.term.id, classroomId: classB.id, studentId: studentB.id },
    });
    const assignmentB = await prisma.teachingAssignment.create({
      data: { schoolId: tenant.school.id, termId: tenant.term.id, teacherId: tenant.teacher.id, classroomId: classB.id, subjectId: tenant.subject.id },
    });
    const timetableB = await prisma.timetableEntry.create({
      data: {
        schoolId: tenant.school.id,
        termId: tenant.term.id,
        teachingAssignmentId: assignmentB.id,
        teacherId: tenant.teacher.id,
        classroomId: classB.id,
        subjectId: tenant.subject.id,
        weekday: 1,
        startTime: new Date("1970-01-01T09:00:00.000Z"),
        endTime: new Date("1970-01-01T09:50:00.000Z"),
      },
    });
    const entries = await listTimetableEntries({
      schoolId: tenant.school.id,
      termId: tenant.term.id,
      teacherId: tenant.teacher.id,
    });
    expect(entries.map((entry) => entry.classroomId)).toEqual([
      tenant.classroom.id,
      classB.id,
    ]);
    expect(new Set(entries.map((entry) => entry.teachingAssignmentId))).toEqual(
      new Set([tenant.teachingAssignment.id, assignmentB.id]),
    );
    const sessionA = await materializeClassSession({ schoolId: tenant.school.id, timetableEntryId: tenant.timetableEntry.id, localDate: "2026-07-20" });
    const sessionB = await materializeClassSession({ schoolId: tenant.school.id, timetableEntryId: timetableB.id, localDate: "2026-07-20" });
    await startClassSession({ schoolId: tenant.school.id, actorUserId: tenant.user.id, sessionId: sessionA.id });
    await expect(startClassSession({ schoolId: tenant.school.id, sessionId: sessionB.id })).rejects.toSatisfy((error) => hasCode(error, "CONFLICT"));
    await expect(updateAttendanceBatch({ schoolId: tenant.school.id, sessionId: sessionA.id, records: [{ studentId: studentB.id, status: "present" }] })).rejects.toSatisfy((error) => hasCode(error, "VALIDATION_ERROR"));
    await updateAttendanceBatch({ schoolId: tenant.school.id, actorUserId: tenant.user.id, sessionId: sessionA.id, records: [{ studentId: tenant.student.id, status: "present" }] });
    const roster = await getSessionAttendanceRoster({ schoolId: tenant.school.id, sessionId: sessionA.id });
    expect(roster.students.map((student) => student.studentId)).toEqual([tenant.student.id]);
    await endClassSession({ schoolId: tenant.school.id, actorUserId: tenant.user.id, sessionId: sessionA.id });
    await expect(updateAttendanceBatch({ schoolId: tenant.school.id, sessionId: sessionA.id, records: [{ studentId: tenant.student.id, status: "late" }] })).rejects.toSatisfy((error) => hasCode(error, "INVALID_STATE_TRANSITION"));
    expect((await listClassSessionTimeline({ schoolId: tenant.school.id, sessionId: sessionA.id })).map((event) => event.eventType)).toEqual(["SESSION_STARTED", "ATTENDANCE_UPDATED", "SESSION_ENDED"]);
  });
});
