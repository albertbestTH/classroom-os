import "dotenv/config";

import { createPrismaClient } from "../src/client.js";
import { hashPassword } from "../src/auth/password.js";

const UAT_SCHOOL_CODE = "UAT-CLASSROOM-OS";
const UAT_CONFIRMATION = "CLASSROOM-OS-UAT";
const TIMEZONE = "Asia/Bangkok";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

type ScheduleDefinition = {
  teacherIndex: number;
  weekday: number;
  classroomIndex: number;
  subjectIndex: number;
  start: string;
  end: string;
};

type CreatedEntry = {
  id: string;
  weekday: number;
  teachingAssignmentId: string;
  teacherId: string;
  classroomId: string;
  subjectId: string;
};

const SUBJECTS = [

  ["UAT-MATH", "UAT Mathematics"],
  ["UAT-SCI", "UAT Science"],
  ["UAT-THAI", "UAT Thai Language"],
  ["UAT-ENG", "UAT English"],
] as const;

const SCHEDULE: readonly ScheduleDefinition[] = [
  { teacherIndex: 0, weekday: 1, classroomIndex: 0, subjectIndex: 0, start: "08:30", end: "10:20" },
  { teacherIndex: 0, weekday: 1, classroomIndex: 1, subjectIndex: 1, start: "10:30", end: "11:20" },
  { teacherIndex: 0, weekday: 2, classroomIndex: 0, subjectIndex: 2, start: "09:30", end: "10:20" },
  { teacherIndex: 1, weekday: 1, classroomIndex: 2, subjectIndex: 2, start: "08:30", end: "09:20" },
  { teacherIndex: 1, weekday: 2, classroomIndex: 3, subjectIndex: 0, start: "10:30", end: "11:20" },
  { teacherIndex: 1, weekday: 3, classroomIndex: 2, subjectIndex: 1, start: "09:30", end: "10:20" },
  { teacherIndex: 2, weekday: 1, classroomIndex: 4, subjectIndex: 3, start: "13:00", end: "13:50" },
  { teacherIndex: 2, weekday: 2, classroomIndex: 5, subjectIndex: 0, start: "08:30", end: "09:20" },
  { teacherIndex: 2, weekday: 4, classroomIndex: 4, subjectIndex: 2, start: "09:30", end: "10:20" },
  { teacherIndex: 3, weekday: 3, classroomIndex: 0, subjectIndex: 1, start: "08:30", end: "09:20" },
  { teacherIndex: 3, weekday: 4, classroomIndex: 1, subjectIndex: 3, start: "10:30", end: "11:20" },
  { teacherIndex: 3, weekday: 5, classroomIndex: 2, subjectIndex: 0, start: "09:30", end: "10:20" },
  { teacherIndex: 4, weekday: 3, classroomIndex: 3, subjectIndex: 2, start: "09:30", end: "10:20" },
  { teacherIndex: 4, weekday: 4, classroomIndex: 4, subjectIndex: 1, start: "08:30", end: "09:20" },
  { teacherIndex: 4, weekday: 5, classroomIndex: 5, subjectIndex: 3, start: "10:30", end: "11:20" },
] as const;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required and is never stored by this script.`);
  return value;
}

function requireStagingDatabaseUrl(): string {
  if (process.env.CLASSROOM_OS_ENV !== "staging") {
    throw new Error("UAT seed requires CLASSROOM_OS_ENV=staging.");
  }
  if (process.env.UAT_SEED_CONFIRM !== UAT_CONFIRMATION) {
    throw new Error(`UAT seed requires UAT_SEED_CONFIRM=${UAT_CONFIRMATION}.`);
  }
  const value = required("DATABASE_URL");
  const url = new URL(value);
  if (!/^postgres(?:ql)?:$/u.test(url.protocol) || LOCAL_HOSTS.has(url.hostname)) {
    throw new Error("UAT seed refuses localhost and non-PostgreSQL DATABASE_URL values.");
  }
  return value;
}

function wallClock(value: string): Date {
  return new Date(`1970-01-01T${value}:00.000Z`);
}

function localDateParts(): { iso: string; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const weekdayByName: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return { iso: `${get("year")}-${get("month")}-${get("day")}`, weekday: weekdayByName[get("weekday")] ?? 1 };
}

function shiftDate(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function localDateTime(iso: string, time: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!, hour! - 7, minute!));
}

async function deleteUatSchool(prisma: ReturnType<typeof createPrismaClient>): Promise<void> {
  const school = await prisma.school.findUnique({ where: { code: UAT_SCHOOL_CODE }, select: { id: true } });
  if (!school) return;
  await prisma.$transaction(async (tx) => {
    const where = { schoolId: school.id };
    await tx.score.deleteMany({ where });
    await tx.attendanceCorrection.deleteMany({ where });
    await tx.attendanceRecord.deleteMany({ where });
    await tx.sessionTimelineEvent.deleteMany({ where });
    await tx.classSession.deleteMany({ where });
    await tx.timetableCoverage.deleteMany({ where });
    await tx.timetableEntry.deleteMany({ where });
    await tx.teachingAssignment.deleteMany({ where });
    await tx.classEnrollment.deleteMany({ where });
    await tx.assessment.deleteMany({ where });
    await tx.passwordResetRequest.deleteMany({ where });
    await tx.emailChangeRequest.deleteMany({ where });
    await tx.authSession.deleteMany({ where });
    await tx.authenticationEvent.deleteMany({ where });
    await tx.auditLog.deleteMany({ where });
    await tx.schoolHoliday.deleteMany({ where });
    await tx.student.deleteMany({ where });
    await tx.classroom.deleteMany({ where });
    await tx.subject.deleteMany({ where });
    await tx.term.deleteMany({ where });
    await tx.academicYear.deleteMany({ where });
    await tx.teacher.deleteMany({ where });
    await tx.user.deleteMany({ where });
    await tx.school.delete({ where: { id: school.id } });
  }, { timeout: 120_000 });
}

async function main(): Promise<void> {
  const databaseUrl = requireStagingDatabaseUrl();
  const teacherPasswords = Array.from({ length: 5 }, (_, index) => required(`UAT_TEACHER_PASSWORD_${String(index + 1).padStart(2, "0")}`));
  const managerPassword = required("UAT_MANAGER_PASSWORD");
  const prisma = createPrismaClient(databaseUrl);
  try {
    await deleteUatSchool(prisma);
    const passwordHashes = await Promise.all([...teacherPasswords, managerPassword].map((password) => hashPassword(password)));
    const localToday = localDateParts();
    const baseDate = localToday.weekday <= 5 ? localToday.iso : shiftDate(localToday.iso, 8 - localToday.weekday);

    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({ data: { code: UAT_SCHOOL_CODE, name: "UAT Classroom OS School", timezone: TIMEZONE, workspaceType: "SCHOOL" } });
      const academicYear = await tx.academicYear.create({ data: { schoolId: school.id, name: "UAT Academic Year 2026", startsOn: new Date("2026-05-01T00:00:00.000Z"), endsOn: new Date("2027-03-31T00:00:00.000Z"), isCurrent: true } });
      const term = await tx.term.create({ data: { schoolId: school.id, academicYearId: academicYear.id, name: "UAT Term 1", startsOn: new Date("2026-05-01T00:00:00.000Z"), endsOn: new Date("2026-10-31T00:00:00.000Z"), isCurrent: true } });
      const owner = await tx.user.create({ data: { schoolId: school.id, email: "uat-owner@classroom-os.test", firstName: "UAT", lastName: "Owner", role: "SCHOOL_OWNER", passwordHash: passwordHashes[5] } });
      await tx.user.create({ data: { schoolId: school.id, email: "uat-admin@classroom-os.test", firstName: "UAT", lastName: "Admin", role: "ADMIN", passwordHash: passwordHashes[5] } });
      const teachers = [];
      for (let index = 0; index < 5; index += 1) {
        const user = await tx.user.create({ data: { schoolId: school.id, email: `uat-teacher-${String(index + 1).padStart(2, "0")}@classroom-os.test`, firstName: "UAT", lastName: `Teacher ${String(index + 1).padStart(2, "0")}`, role: "TEACHER", passwordHash: passwordHashes[index] } });
        teachers.push(await tx.teacher.create({ data: { schoolId: school.id, userId: user.id, employeeCode: `UAT-T-${String(index + 1).padStart(2, "0")}`, firstName: user.firstName, lastName: user.lastName, isActive: true } }));
      }
      const classrooms = [];
      for (let index = 0; index < 6; index += 1) {
        classrooms.push(await tx.classroom.create({ data: { schoolId: school.id, code: `UAT-${String(index + 1).padStart(2, "0")}`, name: `UAT Classroom ${String(index + 1).padStart(2, "0")}`, gradeLevel: `UAT Grade ${index + 1}`, homeroomTeacherId: teachers[index % teachers.length]!.id } }));
      }
      const subjects = [];
      for (const [code, name] of SUBJECTS) subjects.push(await tx.subject.create({ data: { schoolId: school.id, code, name } }));
      const rosters = new Map<string, { id: string }[]>();
      for (const classroom of classrooms) {
        const students = [];
        for (let index = 0; index < 24; index += 1) {
          const student = await tx.student.create({ data: { schoolId: school.id, studentNumber: `${classroom.code}-${String(index + 1).padStart(3, "0")}`, firstName: "UAT Student", lastName: `${classroom.code} ${String(index + 1).padStart(3, "0")}` } });
          await tx.classEnrollment.create({ data: { schoolId: school.id, termId: term.id, classroomId: classroom.id, studentId: student.id, rollNumber: index + 1 } });
          students.push(student);
        }
        rosters.set(classroom.id, students);
      }
      const entries: CreatedEntry[] = [];
      for (const definition of SCHEDULE) {
        const teacher = teachers[definition.teacherIndex]!;
        const classroom = classrooms[definition.classroomIndex]!;
        const subject = subjects[definition.subjectIndex]!;
        const assignment = await tx.teachingAssignment.create({ data: { schoolId: school.id, termId: term.id, teacherId: teacher.id, classroomId: classroom.id, subjectId: subject.id } });
        entries.push(await tx.timetableEntry.create({ data: { schoolId: school.id, termId: term.id, teachingAssignmentId: assignment.id, teacherId: teacher.id, classroomId: classroom.id, subjectId: subject.id, weekday: definition.weekday, startTime: wallClock(definition.start), endTime: wallClock(definition.end), room: classroom.code } }));
      }
      const mondayEntry = entries.find((entry) => entry.weekday === (localToday.weekday <= 5 ? localToday.weekday : 1)) ?? entries[0]!;
      const completedEntry = entries[1]!;
      const cancelledEntry = entries[2]!;
      const createSession = async (entry: (typeof entries)[number], date: string, status: "scheduled" | "completed" | "cancelled") => {
        const definition = SCHEDULE[entries.indexOf(entry)]!;
        return tx.classSession.create({ data: { schoolId: school.id, termId: term.id, timetableEntryId: entry.id, teachingAssignmentId: entry.teachingAssignmentId, teacherId: entry.teacherId, classroomId: entry.classroomId, subjectId: entry.subjectId, scheduledStart: localDateTime(date, definition.start), scheduledEnd: localDateTime(date, definition.end), status, ...(status === "completed" ? { startedAt: localDateTime(date, definition.start), endedAt: localDateTime(date, definition.end) } : {}), ...(status === "cancelled" ? { cancelledAt: localDateTime(date, definition.start), cancellationReason: "UAT synthetic cancellation scenario" } : {}) } });
      };
      const scheduled = await createSession(mondayEntry, baseDate, "scheduled");
      const completed = await createSession(completedEntry, shiftDate(baseDate, -7), "completed");
      const cancelled = await createSession(cancelledEntry, shiftDate(baseDate, -14), "cancelled");
      const roster = rosters.get(completed.classroomId) ?? [];
      for (let index = 0; index < roster.length; index += 1) await tx.attendanceRecord.create({ data: { schoolId: school.id, classSessionId: completed.id, studentId: roster[index]!.id, recordedById: owner.id, status: index % 15 === 0 ? "leave" : index % 10 === 0 ? "late" : index % 12 === 0 ? "absent" : "present" } });
      const assessment = await tx.assessment.create({ data: { schoolId: school.id, termId: term.id, classroomId: completed.classroomId, subjectId: completed.subjectId, teacherId: completed.teacherId, classSessionId: completed.id, title: "UAT participation check", type: "participation", maxScore: 10 } });
      for (const [index, student] of roster.entries()) if (index < 8) await tx.score.create({ data: { schoolId: school.id, assessmentId: assessment.id, studentId: student.id, gradedById: completed.teacherId, value: index === 0 ? 0 : index === 1 ? 10 : index + 1 } });
      await tx.schoolHoliday.create({ data: { schoolId: school.id, localDate: new Date(`${shiftDate(baseDate, 2)}T00:00:00.000Z`), name: "UAT synthetic school holiday" } });
      return { school, teachers, classrooms, subjects, entries, scheduled, completed, cancelled };
    }, { timeout: 120_000 });
    console.info(JSON.stringify({ status: "ready", environment: "staging", schoolCode: UAT_SCHOOL_CODE, schoolId: result.school.id, teacherAccounts: result.teachers.length, classrooms: result.classrooms.length, studentsPerClassroom: 24, subjects: result.subjects.length, timetableEntries: result.entries.length, scheduledSessionId: result.scheduled.id, completedSessionId: result.completed.id, cancelledSessionId: result.cancelled.id, timezone: TIMEZONE, baseDate }));
    console.info("Safe account identifiers: uat-owner@classroom-os.test, uat-admin@classroom-os.test, uat-teacher-01@classroom-os.test ... uat-teacher-05@classroom-os.test");
  } finally {
    await prisma.$disconnect();
  }
}

await main();
