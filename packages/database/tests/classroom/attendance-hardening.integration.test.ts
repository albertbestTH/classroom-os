import { randomUUID } from "node:crypto";

import type { TrustedAuthContext } from "@classroom-os/types";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  cancelClassSession,
  correctCompletedAttendance,
  createAttendanceReportCsv,
  endClassSession,
  getAttendanceReport,
  getSessionAttendanceRoster,
  materializeClassSession,
  startClassSession,
  updateAttendanceBatch,
} from "../../src/index.js";
import { createPrismaClient, disconnectPrisma } from "../../src/client.js";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { cleanupSyntheticSchools, requireSafeIntegrationDatabaseUrl } from "../helpers/database.js";
import { createSyntheticTenant } from "../helpers/factories.js";

describe("attendance reporting and operational hardening", () => {
  const trackedSchoolIds = new Set<string>();
  let prisma: PrismaClient;

  beforeAll(() => { prisma = createPrismaClient(requireSafeIntegrationDatabaseUrl()); });
  afterEach(async () => { await cleanupSyntheticSchools(prisma, trackedSchoolIds); trackedSchoolIds.clear(); });
  afterAll(async () => { await cleanupSyntheticSchools(prisma, trackedSchoolIds); await disconnectPrisma(); await prisma.$disconnect(); });

  it("keeps reports class-scoped and teachers restricted to exact assignments", async () => {
    const tenant = await createSyntheticTenant(prisma, trackedSchoolIds, "report-scope");
    await prisma.classEnrollment.create({ data: { schoolId: tenant.school.id, termId: tenant.term.id, classroomId: tenant.classroom.id, studentId: tenant.student.id } });
    const otherTeacher = await prisma.teacher.create({ data: { schoolId: tenant.school.id, employeeCode: `OT-${randomUUID()}`, firstName: "Synthetic", lastName: "Other" } });
    const otherClassroom = await prisma.classroom.create({ data: { schoolId: tenant.school.id, code: `OC-${randomUUID()}`, name: tenant.classroom.name, gradeLevel: "TEST-5" } });
    const otherStudent = await prisma.student.create({ data: { schoolId: tenant.school.id, studentNumber: `OS-${randomUUID()}`, firstName: "Synthetic", lastName: "Other learner" } });
    await prisma.classEnrollment.create({ data: { schoolId: tenant.school.id, termId: tenant.term.id, classroomId: otherClassroom.id, studentId: otherStudent.id } });
    const otherAssignment = await prisma.teachingAssignment.create({ data: { schoolId: tenant.school.id, termId: tenant.term.id, teacherId: otherTeacher.id, classroomId: otherClassroom.id, subjectId: tenant.subject.id } });
    const otherTimetable = await prisma.timetableEntry.create({ data: { schoolId: tenant.school.id, termId: tenant.term.id, teachingAssignmentId: otherAssignment.id, teacherId: otherTeacher.id, classroomId: otherClassroom.id, subjectId: tenant.subject.id, weekday: 1, startTime: new Date("1970-01-01T10:00:00.000Z"), endTime: new Date("1970-01-01T10:50:00.000Z") } });
    const sessionA = await materializeClassSession({ schoolId: tenant.school.id, timetableEntryId: tenant.timetableEntry.id, localDate: "2026-07-20" });
    const sessionB = await materializeClassSession({ schoolId: tenant.school.id, timetableEntryId: otherTimetable.id, localDate: "2026-07-20" });
    await startClassSession({ schoolId: tenant.school.id, sessionId: sessionA.id });
    await updateAttendanceBatch({ schoolId: tenant.school.id, sessionId: sessionA.id, records: [{ studentId: tenant.student.id, status: "present" }] });
    await endClassSession({ schoolId: tenant.school.id, sessionId: sessionA.id });
    await startClassSession({ schoolId: tenant.school.id, sessionId: sessionB.id });
    await updateAttendanceBatch({ schoolId: tenant.school.id, sessionId: sessionB.id, records: [{ studentId: otherStudent.id, status: "absent" }] });
    await endClassSession({ schoolId: tenant.school.id, sessionId: sessionB.id });

    const teacherAuth: TrustedAuthContext = { userId: tenant.user.id, schoolId: tenant.school.id, role: "TEACHER", teacherId: tenant.teacher.id };
    const teacherReport = await getAttendanceReport({ schoolId: tenant.school.id, auth: teacherAuth, filters: { termId: tenant.term.id, from: "2026-07-20", to: "2026-07-20" } });
    expect(teacherReport.sessions.map(({ sessionId }) => sessionId)).toEqual([sessionA.id]);
    expect(teacherReport.students).toHaveLength(1);

    const managerAuth: TrustedAuthContext = { ...teacherAuth, role: "ADMIN", teacherId: null };
    const managerReport = await getAttendanceReport({ schoolId: tenant.school.id, auth: managerAuth, filters: { termId: tenant.term.id, from: "2026-07-20", to: "2026-07-20" } });
    expect(managerReport.sessions).toHaveLength(2);
    expect(managerReport.students).toHaveLength(2);
    expect(new Set(managerReport.students.map(({ classroomId }) => classroomId))).toEqual(new Set([tenant.classroom.id, otherClassroom.id]));
    const csv = createAttendanceReportCsv(managerReport);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("รหัสนักเรียน");

    const foreignTenant = await createSyntheticTenant(prisma, trackedSchoolIds, "foreign-report");
    await expect(getAttendanceReport({ schoolId: foreignTenant.school.id, auth: managerAuth })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("records immutable completed corrections and enforces forward-only cancellation", async () => {
    const tenant = await createSyntheticTenant(prisma, trackedSchoolIds, "correction");
    await prisma.classEnrollment.create({ data: { schoolId: tenant.school.id, termId: tenant.term.id, classroomId: tenant.classroom.id, studentId: tenant.student.id } });
    const admin = await prisma.user.create({ data: { schoolId: tenant.school.id, email: `admin+${randomUUID()}@example.invalid`, firstName: "Synthetic", lastName: "Admin", role: "ADMIN" } });
    const adminAuth: TrustedAuthContext = { userId: admin.id, schoolId: tenant.school.id, role: "ADMIN", teacherId: null };
    const teacherAuth: TrustedAuthContext = { userId: tenant.user.id, schoolId: tenant.school.id, role: "TEACHER", teacherId: tenant.teacher.id };
    const session = await materializeClassSession({ schoolId: tenant.school.id, timetableEntryId: tenant.timetableEntry.id, localDate: "2026-07-20" });
    await startClassSession({ schoolId: tenant.school.id, sessionId: session.id });
    await updateAttendanceBatch({ schoolId: tenant.school.id, sessionId: session.id, records: [{ studentId: tenant.student.id, status: "present" }] });
    await endClassSession({ schoolId: tenant.school.id, sessionId: session.id });
    const roster = await getSessionAttendanceRoster({ schoolId: tenant.school.id, sessionId: session.id });
    const recordVersion = roster.students[0]!.recordUpdatedAt!;
    const otherStudent = await prisma.student.create({ data: { schoolId: tenant.school.id, studentNumber: `UNENROLLED-${randomUUID()}`, firstName: "Synthetic", lastName: "Unenrolled" } });

    await expect(correctCompletedAttendance({ schoolId: tenant.school.id, auth: teacherAuth, sessionId: session.id, studentId: tenant.student.id, status: "late", reason: "Synthetic correction", expectedRecordUpdatedAt: recordVersion })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(correctCompletedAttendance({ schoolId: tenant.school.id, auth: adminAuth, sessionId: session.id, studentId: otherStudent.id, status: "late", reason: "Cross-class attempt", expectedRecordUpdatedAt: recordVersion })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const correction = await correctCompletedAttendance({ schoolId: tenant.school.id, auth: adminAuth, sessionId: session.id, studentId: tenant.student.id, status: "late", reason: "Synthetic correction", expectedRecordUpdatedAt: recordVersion });
    expect(correction).toMatchObject({ beforeStatus: "present", afterStatus: "late", reason: "Synthetic correction" });
    expect(await prisma.attendanceCorrection.count({ where: { schoolId: tenant.school.id, classSessionId: session.id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { schoolId: tenant.school.id, action: "attendance.corrected", entityId: correction.id } })).toBe(1);
    await expect(correctCompletedAttendance({ schoolId: tenant.school.id, auth: adminAuth, sessionId: session.id, studentId: tenant.student.id, status: "absent", reason: "Stale synthetic correction", expectedRecordUpdatedAt: recordVersion })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(cancelClassSession({ schoolId: tenant.school.id, auth: adminAuth, sessionId: session.id, reason: "Too late" })).rejects.toMatchObject({ code: "INVALID_STATE_TRANSITION" });

    const scheduled = await materializeClassSession({ schoolId: tenant.school.id, timetableEntryId: tenant.timetableEntry.id, localDate: "2026-07-27" });
    const cancelled = await cancelClassSession({ schoolId: tenant.school.id, auth: teacherAuth, sessionId: scheduled.id, reason: "Synthetic school closure", expectedUpdatedAt: scheduled.updatedAt });
    expect(cancelled).toMatchObject({ status: "cancelled", cancellationReason: "Synthetic school closure" });
    await expect(startClassSession({ schoolId: tenant.school.id, sessionId: cancelled.id })).rejects.toMatchObject({ code: "INVALID_STATE_TRANSITION" });
  });
});
