import { randomUUID } from "node:crypto";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { createTimetableEntry, listTimetableEntries, updateTimetableEntry } from "../../src/index.js";
import { createPrismaClient, disconnectPrisma } from "../../src/client.js";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { cleanupSyntheticSchools, requireSafeIntegrationDatabaseUrl } from "../helpers/database.js";
import { createSyntheticTenant } from "../helpers/factories.js";

const hasCode = (code: string, conflict?: string) => (error: unknown) => {
  expect(error).toMatchObject({ code, ...(conflict ? { details: { conflict } } : {}) });
  return true;
};

describe("HOTFIX-002 timetable scheduling", () => {
  const trackedSchoolIds = new Set<string>();
  let prisma: PrismaClient;
  beforeAll(() => { prisma = createPrismaClient(requireSafeIntegrationDatabaseUrl()); });
  afterEach(async () => { await cleanupSyntheticSchools(prisma, trackedSchoolIds); trackedSchoolIds.clear(); });
  afterAll(async () => { await cleanupSyntheticSchools(prisma, trackedSchoolIds); await disconnectPrisma(); await prisma.$disconnect(); });

  it("keeps repeated assignment slots separate across days and non-overlapping same-day times", async () => {
    const tenant = await createSyntheticTenant(prisma, trackedSchoolIds, "repeat-slots");
    const base = { schoolId: tenant.school.id, termId: tenant.term.id, teacherId: tenant.teacher.id, classroomId: tenant.classroom.id, subjectId: tenant.subject.id };
    const wednesday = await createTimetableEntry({ ...base, weekday: 3, startTime: "10:30", endTime: "11:20" });
    const friday = await createTimetableEntry({ ...base, weekday: 5, startTime: "13:00", endTime: "13:50" });
    const mondayLater = await createTimetableEntry({ ...base, weekday: 1, startTime: "10:30", endTime: "11:20" });
    const listed = await listTimetableEntries({ schoolId: tenant.school.id, termId: tenant.term.id });
    expect(listed.filter((entry) => entry.teachingAssignmentId === tenant.teachingAssignment.id).map((entry) => entry.id)).toEqual([
      tenant.timetableEntry.id, mondayLater.id, wednesday.id, friday.id,
    ]);
  });

  it("rejects exact duplicates and overlaps but allows adjacent slots", async () => {
    const tenant = await createSyntheticTenant(prisma, trackedSchoolIds, "conflicts");
    const base = { schoolId: tenant.school.id, termId: tenant.term.id, teacherId: tenant.teacher.id, classroomId: tenant.classroom.id, subjectId: tenant.subject.id, weekday: 1 };
    await expect(createTimetableEntry({ ...base, startTime: "08:00", endTime: "08:50" })).rejects.toSatisfy(hasCode("CONFLICT", "exact_duplicate"));
    await expect(createTimetableEntry({ ...base, startTime: "08:30", endTime: "09:20" })).rejects.toSatisfy(hasCode("CONFLICT", "teacher"));
    await expect(createTimetableEntry({ ...base, startTime: "08:50", endTime: "09:40" })).resolves.toMatchObject({ startTime: "08:50", endTime: "09:40" });
    await expect(createTimetableEntry({ ...base, startTime: "09:40", endTime: "09:40" })).rejects.toSatisfy(hasCode("VALIDATION_ERROR"));
    await expect(createTimetableEntry({ ...base, startTime: "bad", endTime: "10:20" })).rejects.toSatisfy(hasCode("VALIDATION_ERROR"));
  });

  it("distinguishes classroom conflicts and rejects cross-tenant references", async () => {
    const tenant = await createSyntheticTenant(prisma, trackedSchoolIds, "classroom-conflict");
    const other = await createSyntheticTenant(prisma, trackedSchoolIds, "foreign-assignment");
    const suffix = randomUUID().slice(0, 8);
    const teacher = await prisma.teacher.create({ data: { schoolId: tenant.school.id, employeeCode: `SYN-T-${suffix}`, firstName: "Synthetic", lastName: "Other" } });
    await prisma.teachingAssignment.create({ data: { schoolId: tenant.school.id, termId: tenant.term.id, teacherId: teacher.id, classroomId: tenant.classroom.id, subjectId: tenant.subject.id } });
    await expect(createTimetableEntry({ schoolId: tenant.school.id, termId: tenant.term.id, teacherId: teacher.id, classroomId: tenant.classroom.id, subjectId: tenant.subject.id, weekday: 1, startTime: "08:20", endTime: "09:00" })).rejects.toSatisfy(hasCode("CONFLICT", "classroom"));
    await expect(createTimetableEntry({ schoolId: tenant.school.id, termId: other.term.id, teacherId: other.teacher.id, classroomId: other.classroom.id, subjectId: other.subject.id, weekday: 2, startTime: "09:00", endTime: "09:50" })).rejects.toSatisfy(hasCode("NOT_FOUND"));
  });

  it("persists edits, excludes itself, and rejects teacher, classroom, and cross-school update conflicts", async () => {
    const tenant = await createSyntheticTenant(prisma, trackedSchoolIds, "edit-slot");
    const foreign = await createSyntheticTenant(prisma, trackedSchoolIds, "foreign-edit");
    await expect(updateTimetableEntry({ schoolId: tenant.school.id, timetableEntryId: tenant.timetableEntry.id, weekday: 4, startTime: "09:20", endTime: "10:10" })).resolves.toMatchObject({ id: tenant.timetableEntry.id, weekday: 4, startTime: "09:20", endTime: "10:10" });
    await expect(updateTimetableEntry({ schoolId: tenant.school.id, timetableEntryId: tenant.timetableEntry.id, weekday: 4, startTime: "09:20", endTime: "10:10" })).resolves.toMatchObject({ id: tenant.timetableEntry.id });
    expect(await prisma.timetableEntry.findUnique({ where: { id: tenant.timetableEntry.id }, select: { weekday: true } })).toEqual({ weekday: 4 });

    const suffix = randomUUID().slice(0, 8);
    const otherClassroom = await prisma.classroom.create({ data: { schoolId: tenant.school.id, code: `SYN-C-${suffix}`, name: "Synthetic Other Class", gradeLevel: "TEST" } });
    const otherTeacher = await prisma.teacher.create({ data: { schoolId: tenant.school.id, employeeCode: `SYN-T-${suffix}`, firstName: "Synthetic", lastName: "Other" } });
    const assignmentByClass = await prisma.teachingAssignment.create({ data: { schoolId: tenant.school.id, termId: tenant.term.id, teacherId: tenant.teacher.id, classroomId: otherClassroom.id, subjectId: tenant.subject.id } });
    const assignmentByTeacher = await prisma.teachingAssignment.create({ data: { schoolId: tenant.school.id, termId: tenant.term.id, teacherId: otherTeacher.id, classroomId: tenant.classroom.id, subjectId: tenant.subject.id } });
    const teacherConflict = await prisma.timetableEntry.create({ data: { schoolId: tenant.school.id, termId: tenant.term.id, teachingAssignmentId: assignmentByClass.id, teacherId: tenant.teacher.id, classroomId: otherClassroom.id, subjectId: tenant.subject.id, weekday: 2, startTime: new Date("1970-01-01T10:00:00Z"), endTime: new Date("1970-01-01T10:50:00Z") } });
    const classroomConflict = await prisma.timetableEntry.create({ data: { schoolId: tenant.school.id, termId: tenant.term.id, teachingAssignmentId: assignmentByTeacher.id, teacherId: otherTeacher.id, classroomId: tenant.classroom.id, subjectId: tenant.subject.id, weekday: 3, startTime: new Date("1970-01-01T10:00:00Z"), endTime: new Date("1970-01-01T10:50:00Z") } });
    await expect(updateTimetableEntry({ schoolId: tenant.school.id, timetableEntryId: teacherConflict.id, weekday: 4, startTime: "09:30", endTime: "10:20" })).rejects.toSatisfy(hasCode("CONFLICT", "teacher"));
    await expect(updateTimetableEntry({ schoolId: tenant.school.id, timetableEntryId: classroomConflict.id, weekday: 4, startTime: "09:30", endTime: "10:20" })).rejects.toSatisfy(hasCode("CONFLICT", "classroom"));
    await expect(updateTimetableEntry({ schoolId: foreign.school.id, timetableEntryId: tenant.timetableEntry.id, weekday: 2 })).rejects.toSatisfy(hasCode("NOT_FOUND"));
  });
});
