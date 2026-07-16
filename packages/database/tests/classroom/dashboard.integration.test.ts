import { randomUUID } from "node:crypto";

import type { TrustedAuthContext } from "@classroom-os/types";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  endClassSession,
  getDashboardOverview,
  materializeClassSession,
  startClassSession,
  updateAttendanceBatch,
} from "../../src/index.js";
import { createPrismaClient, disconnectPrisma } from "../../src/client.js";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { cleanupSyntheticSchools, requireSafeIntegrationDatabaseUrl } from "../helpers/database.js";
import { createSyntheticTenant } from "../helpers/factories.js";

describe("dashboard analytics", () => {
  const schoolIds = new Set<string>();
  let prisma: PrismaClient;

  beforeAll(() => { prisma = createPrismaClient(requireSafeIntegrationDatabaseUrl()); });
  afterEach(async () => { await cleanupSyntheticSchools(prisma, schoolIds); schoolIds.clear(); });
  afterAll(async () => { await cleanupSyntheticSchools(prisma, schoolIds); await disconnectPrisma(); await prisma.$disconnect(); });

  it("separates assigned classrooms, excludes foreign scopes, and preserves no-session days", async () => {
    const tenant = await createSyntheticTenant(prisma, schoolIds, "dashboard");
    const studentA = tenant.student;
    const studentB = await prisma.student.create({ data: { schoolId: tenant.school.id, studentNumber: `B-${randomUUID()}`, firstName: "Synthetic", lastName: "Repeated absence" } });
    const classroomB = await prisma.classroom.create({ data: { schoolId: tenant.school.id, code: `B-${randomUUID()}`, name: "Synthetic Classroom B", gradeLevel: "TEST-5" } });
    const assignmentB = await prisma.teachingAssignment.create({ data: { schoolId: tenant.school.id, termId: tenant.term.id, teacherId: tenant.teacher.id, classroomId: classroomB.id, subjectId: tenant.subject.id } });
    const timetableB = await prisma.timetableEntry.create({ data: { schoolId: tenant.school.id, termId: tenant.term.id, teachingAssignmentId: assignmentB.id, teacherId: tenant.teacher.id, classroomId: classroomB.id, subjectId: tenant.subject.id, weekday: 1, startTime: new Date("1970-01-01T09:00:00.000Z"), endTime: new Date("1970-01-01T09:50:00.000Z") } });
    const timetableBFriday = await prisma.timetableEntry.create({ data: { schoolId: tenant.school.id, termId: tenant.term.id, teachingAssignmentId: assignmentB.id, teacherId: tenant.teacher.id, classroomId: classroomB.id, subjectId: tenant.subject.id, weekday: 5, startTime: new Date("1970-01-01T09:00:00.000Z"), endTime: new Date("1970-01-01T09:50:00.000Z") } });
    await prisma.classEnrollment.createMany({ data: [
      { schoolId: tenant.school.id, termId: tenant.term.id, classroomId: tenant.classroom.id, studentId: studentA.id },
      { schoolId: tenant.school.id, termId: tenant.term.id, classroomId: classroomB.id, studentId: studentB.id },
    ] });

    const otherTeacherUser = await prisma.user.create({ data: { schoolId: tenant.school.id, email: `teacher-c+${randomUUID()}@example.invalid`, firstName: "Synthetic", lastName: "Unassigned", role: "TEACHER" } });
    const otherTeacher = await prisma.teacher.create({ data: { schoolId: tenant.school.id, userId: otherTeacherUser.id, employeeCode: `C-${randomUUID()}`, firstName: "Synthetic", lastName: "Unassigned" } });
    const classroomC = await prisma.classroom.create({ data: { schoolId: tenant.school.id, code: `C-${randomUUID()}`, name: "Synthetic Classroom C", gradeLevel: "TEST-5" } });
    const studentC = await prisma.student.create({ data: { schoolId: tenant.school.id, studentNumber: `C-${randomUUID()}`, firstName: "Synthetic", lastName: "Excluded" } });
    const assignmentC = await prisma.teachingAssignment.create({ data: { schoolId: tenant.school.id, termId: tenant.term.id, teacherId: otherTeacher.id, classroomId: classroomC.id, subjectId: tenant.subject.id } });
    const timetableC = await prisma.timetableEntry.create({ data: { schoolId: tenant.school.id, termId: tenant.term.id, teachingAssignmentId: assignmentC.id, teacherId: otherTeacher.id, classroomId: classroomC.id, subjectId: tenant.subject.id, weekday: 1, startTime: new Date("1970-01-01T10:00:00.000Z"), endTime: new Date("1970-01-01T10:50:00.000Z") } });
    await prisma.classEnrollment.create({ data: { schoolId: tenant.school.id, termId: tenant.term.id, classroomId: classroomC.id, studentId: studentC.id } });

    async function complete(timetableEntryId: string, localDate: string, studentId: string, status: "present" | "absent") {
      const session = await materializeClassSession({ schoolId: tenant.school.id, timetableEntryId, localDate });
      await startClassSession({ schoolId: tenant.school.id, sessionId: session.id });
      await updateAttendanceBatch({ schoolId: tenant.school.id, sessionId: session.id, records: [{ studentId, status }] });
      await endClassSession({ schoolId: tenant.school.id, sessionId: session.id });
      return session;
    }
    await complete(tenant.timetableEntry.id, "2026-07-20", studentA.id, "present");
    await complete(timetableBFriday.id, "2026-07-17", studentB.id, "absent");
    await complete(timetableB.id, "2026-07-20", studentB.id, "absent");
    await complete(timetableC.id, "2026-07-20", studentC.id, "present");

    const teacherAuth: TrustedAuthContext = { userId: tenant.user.id, schoolId: tenant.school.id, role: "TEACHER", teacherId: tenant.teacher.id };
    const now = new Date("2026-07-20T12:00:00.000Z");
    const teacher = await getDashboardOverview({ schoolId: tenant.school.id, auth: teacherAuth, now });
    expect(teacher.scope).toBe("TEACHER");
    expect(teacher.viewerRole).toBe("TEACHER");
    expect(teacher.selectedTeacher).toBeNull();
    expect(teacher.availableTeachingContexts).toEqual(expect.arrayContaining([
      expect.objectContaining({ teachingAssignmentId: tenant.teachingAssignment.id, teacherId: tenant.teacher.id, classroomId: tenant.classroom.id, subjectId: tenant.subject.id }),
      expect.objectContaining({ teachingAssignmentId: assignmentB.id, teacherId: tenant.teacher.id, classroomId: classroomB.id, subjectId: tenant.subject.id }),
    ]));
    expect(teacher.availableTeachingContexts).toHaveLength(2);
    expect(teacher.availableTeachingContexts.some(({ classroomId }) => classroomId === classroomC.id)).toBe(false);
    expect(teacher.classrooms).toHaveLength(2);
    expect(new Set(teacher.classrooms.map(({ classroomId }) => classroomId))).toEqual(new Set([tenant.classroom.id, classroomB.id]));
    expect(teacher.classrooms.find(({ classroomId }) => classroomId === tenant.classroom.id)?.attendancePercentage).toBe(100);
    expect(teacher.classrooms.find(({ classroomId }) => classroomId === classroomB.id)?.attendancePercentage).toBe(0);
    expect(new Set(teacher.classrooms.map(({ subjectId }) => subjectId))).toEqual(new Set([tenant.subject.id]));
    expect(teacher.repeatedAbsences).toEqual([expect.objectContaining({ studentId: studentB.id, classroomId: classroomB.id, absenceCount: 2 })]);
    expect(teacher.trend.find(({ date }) => date === "2026-07-15")).toMatchObject({ percentage: null, hasSessions: false });
    expect(teacher.trend.find(({ date }) => date === "2026-07-20")).toMatchObject({ attendedCount: 1, eligibleCount: 2, percentage: 50 });
    const timezoneBoundary = await getDashboardOverview({ schoolId: tenant.school.id, auth: teacherAuth, now: new Date("2026-07-19T18:00:00.000Z") });
    expect(timezoneBoundary.localDate).toBe("2026-07-20");

    const admin = await prisma.user.create({ data: { schoolId: tenant.school.id, email: `admin+${randomUUID()}@example.invalid`, firstName: "Synthetic", lastName: "Admin", role: "ADMIN" } });
    const manager = await getDashboardOverview({ schoolId: tenant.school.id, auth: { userId: admin.id, schoolId: tenant.school.id, role: "ADMIN", teacherId: null }, filters: { days: 30 }, now });
    expect(manager.scope).toBe("SCHOOL");
    expect(manager.viewerRole).toBe("ADMIN");
    expect(manager.scopeLabel).toBe("ภาพรวมทั้งโรงเรียน");
    expect(manager.selectedTeacher).toBeNull();
    expect(manager.filters.termId).toBe(tenant.term.id);
    expect(manager.filterOptions.terms).toContainEqual({ id: tenant.term.id, label: tenant.term.name });
    expect(new Set(manager.classrooms.map(({ classroomId }) => classroomId))).toEqual(new Set([tenant.classroom.id, classroomB.id, classroomC.id]));

    const teacherFiltered = await getDashboardOverview({
      schoolId: tenant.school.id,
      auth: { userId: admin.id, schoolId: tenant.school.id, role: "ADMIN", teacherId: null },
      filters: { teacherId: otherTeacher.id },
      now,
    });
    expect(teacherFiltered.scope).toBe("TEACHER_FILTERED");
    expect(teacherFiltered.scopeLabel).toBe("กำลังดูข้อมูลของครู: Synthetic Unassigned");
    expect(teacherFiltered.selectedTeacher).toEqual({ id: otherTeacher.id, label: "Synthetic Unassigned" });
    expect(teacherFiltered.classrooms.map(({ classroomId }) => classroomId)).toEqual([classroomC.id]);
    await expect(getDashboardOverview({
      schoolId: tenant.school.id,
      auth: { userId: admin.id, schoolId: tenant.school.id, role: "ADMIN", teacherId: null },
      filters: { teacherId: otherTeacher.id, classroomId: tenant.classroom.id },
      now,
    })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(getDashboardOverview({ schoolId: tenant.school.id, auth: teacherAuth, filters: { teacherId: otherTeacher.id }, now })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(getDashboardOverview({ schoolId: tenant.school.id, auth: teacherAuth, filters: { classroomId: classroomC.id }, now })).rejects.toMatchObject({ code: "FORBIDDEN" });

    const foreign = await createSyntheticTenant(prisma, schoolIds, "foreign-dashboard");
    expect(teacher.classrooms.some(({ classroomId }) => classroomId === foreign.classroom.id)).toBe(false);
    await expect(getDashboardOverview({ schoolId: foreign.school.id, auth: teacherAuth, now })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects manager-only and malformed teacher filters with stable codes", async () => {
    const tenant = await createSyntheticTenant(prisma, schoolIds, "dashboard-filters");
    const auth: TrustedAuthContext = { userId: tenant.user.id, schoolId: tenant.school.id, role: "TEACHER", teacherId: tenant.teacher.id };
    await expect(getDashboardOverview({ schoolId: tenant.school.id, auth, filters: { days: 30 } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(getDashboardOverview({ schoolId: tenant.school.id, auth, filters: { termId: tenant.term.id } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(getDashboardOverview({ schoolId: tenant.school.id, auth, filters: { classroomId: "bad-id" } })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
