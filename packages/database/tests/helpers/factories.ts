import { randomUUID } from "node:crypto";

import type { PrismaClient } from "../../src/generated/prisma/client.js";

export type SyntheticTenant = Awaited<ReturnType<typeof createSyntheticTenant>>;

export async function createSyntheticTenant(
  prisma: PrismaClient,
  trackedSchoolIds: Set<string>,
  label: string,
) {
  const token = `${label}-${randomUUID().slice(0, 8)}`.toLowerCase();
  const school = await prisma.school.create({
    data: {
      name: `Synthetic Academy ${token}`,
      code: `SYN-${token}`,
      timezone: "Asia/Bangkok",
    },
  });
  trackedSchoolIds.add(school.id);

  const academicYear = await prisma.academicYear.create({
    data: {
      schoolId: school.id,
      name: `Synthetic Year ${token}`,
      startsOn: new Date("2026-05-01T00:00:00.000Z"),
      endsOn: new Date("2027-03-31T00:00:00.000Z"),
      isCurrent: true,
    },
  });
  const term = await prisma.term.create({
    data: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      name: `Synthetic Term ${token}`,
      startsOn: new Date("2026-05-01T00:00:00.000Z"),
      endsOn: new Date("2026-09-30T00:00:00.000Z"),
      isCurrent: true,
    },
  });
  const user = await prisma.user.create({
    data: {
      schoolId: school.id,
      email: `teacher+${token}@example.invalid`,
      firstName: "Synthetic",
      lastName: "Teacher",
      role: "TEACHER",
    },
  });
  const teacher = await prisma.teacher.create({
    data: {
      schoolId: school.id,
      userId: user.id,
      employeeCode: `T-${token}`,
      firstName: "Synthetic",
      lastName: "Teacher",
    },
  });
  const student = await prisma.student.create({
    data: {
      schoolId: school.id,
      studentNumber: `ST-${token}`,
      firstName: "Synthetic",
      lastName: `Learner-${token}`,
      preferredName: "Test Learner",
    },
  });
  const classroom = await prisma.classroom.create({
    data: {
      schoolId: school.id,
      homeroomTeacherId: teacher.id,
      code: `C-${token}`,
      name: `Synthetic Classroom ${token}`,
      gradeLevel: "TEST-5",
    },
  });
  const subject = await prisma.subject.create({
    data: {
      schoolId: school.id,
      code: `SUB-${token}`,
      name: `Synthetic Mathematics ${token}`,
    },
  });
  const teachingAssignment = await prisma.teachingAssignment.create({
    data: {
      schoolId: school.id,
      termId: term.id,
      teacherId: teacher.id,
      classroomId: classroom.id,
      subjectId: subject.id,
    },
  });
  const timetableEntry = await prisma.timetableEntry.create({
    data: {
      schoolId: school.id,
      termId: term.id,
      teacherId: teacher.id,
      classroomId: classroom.id,
      subjectId: subject.id,
      weekday: 1,
      startTime: new Date("1970-01-01T08:00:00.000Z"),
      endTime: new Date("1970-01-01T08:50:00.000Z"),
      room: "SYNTHETIC-ROOM",
    },
  });

  return {
    school,
    academicYear,
    term,
    user,
    teacher,
    student,
    classroom,
    subject,
    teachingAssignment,
    timetableEntry,
  };
}
