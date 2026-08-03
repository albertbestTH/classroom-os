import "dotenv/config";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createPrismaClient } from "../src/client.js";

const SAFE_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const EXPECTED_HEADERS = ["ระดับชั้น", "ห้อง", "เลขที่", "รหัสนักเรียน", "ชื่อ", "นามสกุล", "เพศ"] as const;

type StudentCsvRow = Record<(typeof EXPECTED_HEADERS)[number], string>;

type ScheduleDefinition = {
  weekday: number;
  classroomIndex: number;
  subjectIndex: number;
  startTime: string;
  endTime: string;
  periodUnits: number;
};

const SUBJECTS = [
  ["MATH", "คณิตศาสตร์"],
  ["SCI", "วิทยาศาสตร์"],
  ["THAI", "ภาษาไทย"],
  ["SOC", "สังคมศึกษา"],
  ["ENG", "ภาษาอังกฤษ"],
  ["COMP", "คอมพิวเตอร์"],
] as const;

const SCHEDULE: readonly ScheduleDefinition[] = [
  { weekday: 1, classroomIndex: 0, subjectIndex: 0, startTime: "08:30", endTime: "10:20", periodUnits: 2 },
  { weekday: 1, classroomIndex: 1, subjectIndex: 2, startTime: "10:30", endTime: "11:20", periodUnits: 1 },
  { weekday: 1, classroomIndex: 2, subjectIndex: 1, startTime: "13:00", endTime: "13:50", periodUnits: 1 },
  { weekday: 1, classroomIndex: 3, subjectIndex: 5, startTime: "14:00", endTime: "14:50", periodUnits: 1 },
  { weekday: 2, classroomIndex: 4, subjectIndex: 0, startTime: "08:30", endTime: "09:20", periodUnits: 1 },
  { weekday: 2, classroomIndex: 5, subjectIndex: 4, startTime: "09:30", endTime: "10:20", periodUnits: 1 },
  { weekday: 2, classroomIndex: 6, subjectIndex: 1, startTime: "10:30", endTime: "11:20", periodUnits: 1 },
  { weekday: 2, classroomIndex: 7, subjectIndex: 3, startTime: "13:00", endTime: "13:50", periodUnits: 1 },
  { weekday: 2, classroomIndex: 0, subjectIndex: 2, startTime: "14:00", endTime: "14:50", periodUnits: 1 },
  { weekday: 3, classroomIndex: 1, subjectIndex: 1, startTime: "13:00", endTime: "14:50", periodUnits: 2 },
  { weekday: 3, classroomIndex: 2, subjectIndex: 0, startTime: "08:30", endTime: "09:20", periodUnits: 1 },
  { weekday: 3, classroomIndex: 3, subjectIndex: 5, startTime: "10:30", endTime: "11:20", periodUnits: 1 },
  { weekday: 4, classroomIndex: 4, subjectIndex: 2, startTime: "08:30", endTime: "09:20", periodUnits: 1 },
  { weekday: 4, classroomIndex: 5, subjectIndex: 4, startTime: "09:30", endTime: "10:20", periodUnits: 1 },
  { weekday: 4, classroomIndex: 6, subjectIndex: 3, startTime: "10:30", endTime: "11:20", periodUnits: 1 },
  { weekday: 4, classroomIndex: 7, subjectIndex: 0, startTime: "13:00", endTime: "13:50", periodUnits: 1 },
  { weekday: 5, classroomIndex: 0, subjectIndex: 5, startTime: "08:30", endTime: "09:20", periodUnits: 1 },
  { weekday: 5, classroomIndex: 1, subjectIndex: 1, startTime: "09:30", endTime: "10:20", periodUnits: 1 },
  { weekday: 5, classroomIndex: 2, subjectIndex: 2, startTime: "10:30", endTime: "11:20", periodUnits: 1 },
  { weekday: 5, classroomIndex: 3, subjectIndex: 3, startTime: "13:00", endTime: "13:50", periodUnits: 1 },
];

function requireSafeDatabaseUrl(): string {
  if (process.env.NODE_ENV === "production") throw new Error("Personal demo reset is disabled in production.");
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  const parsed = new URL(databaseUrl);
  if (!SAFE_HOSTS.has(parsed.hostname) || parsed.pathname.replace(/^\//, "") !== "classroom_os") {
    throw new Error("Personal demo reset only runs against the local classroom_os database.");
  }
  return databaseUrl;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]!;
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      fields.push(field.trim());
      field = "";
    } else {
      field += character;
    }
  }
  fields.push(field.trim());
  return fields;
}

async function readSyntheticRoster(filePath: string): Promise<StudentCsvRow[]> {
  const source = (await readFile(filePath, "utf8")).replace(/^\uFEFF/, "");
  const lines = source.split(/\r?\n/u).filter((line) => line.trim());
  const headers = parseCsvLine(lines.shift() ?? "");
  if (headers.length !== EXPECTED_HEADERS.length || EXPECTED_HEADERS.some((header, index) => headers[index] !== header)) {
    throw new Error(`CSV headers must be: ${EXPECTED_HEADERS.join(",")}`);
  }
  const rows = lines.map((line, rowIndex) => {
    const values = parseCsvLine(line);
    if (values.length !== EXPECTED_HEADERS.length || values.some((value) => !value)) {
      throw new Error(`CSV row ${rowIndex + 2} is incomplete.`);
    }
    return Object.fromEntries(EXPECTED_HEADERS.map((header, index) => [header, values[index]!])) as StudentCsvRow;
  });
  const studentNumbers = new Set(rows.map((row) => row["รหัสนักเรียน"]));
  if (studentNumbers.size !== rows.length) throw new Error("CSV contains duplicate student IDs.");
  const rollNumbers = new Set(rows.map((row) => `${row["ห้อง"]}:${row["เลขที่"]}`));
  if (rollNumbers.size !== rows.length) throw new Error("CSV contains duplicate roll numbers in a classroom.");
  return rows;
}

function wallClock(value: string): Date {
  return new Date(`1970-01-01T${value}:00.000Z`);
}

async function main(): Promise<void> {
  const csvArgument = process.argv[2];
  if (!csvArgument) throw new Error("Provide the synthetic student CSV path as the first argument.");
  const rows = await readSyntheticRoster(resolve(csvArgument));
  const classroomDefinitions = Array.from(new Map(rows.map((row) => [row["ห้อง"], {
    code: row["ห้อง"],
    name: row["ห้อง"],
    gradeLevel: row["ระดับชั้น"],
  }])).values());
  if (classroomDefinitions.length < 18) throw new Error("The timetable fixture requires at least 18 classrooms.");
  const weeklyPeriodUnits = SCHEDULE.reduce((total, entry) => total + entry.periodUnits, 0);
  if (weeklyPeriodUnits > 24) throw new Error(`Weekly teaching load exceeds 24 periods: ${weeklyPeriodUnits}.`);

  const prisma = createPrismaClient(requireSafeDatabaseUrl());
  try {
    const personalOwners = await prisma.user.findMany({
      where: { role: "SCHOOL_OWNER", school: { workspaceType: "PERSONAL" } },
      include: { school: true, teacherProfile: true },
    });
    if (personalOwners.length !== 1 || !personalOwners[0]?.teacherProfile || !personalOwners[0].passwordHash) {
      throw new Error("Expected exactly one password-enabled PERSONAL owner with a teacher profile.");
    }
    const owner = personalOwners[0];
    const teacherSnapshot = owner.teacherProfile;
    const schoolSnapshot = owner.school;

    await prisma.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe('TRUNCATE TABLE "School", "PendingSchoolRegistration" RESTART IDENTITY CASCADE');
      const school = await transaction.school.create({
        data: {
          id: schoolSnapshot.id,
          name: schoolSnapshot.name,
          code: schoolSnapshot.code,
          timezone: "Asia/Bangkok",
          email: schoolSnapshot.email,
          phoneNumber: schoolSnapshot.phoneNumber,
          address: schoolSnapshot.address,
          workspaceType: "PERSONAL",
          isActive: true,
        },
      });
      const user = await transaction.user.create({
        data: {
          id: owner.id,
          schoolId: school.id,
          email: owner.email,
          firstName: owner.firstName,
          lastName: owner.lastName,
          phoneNumber: owner.phoneNumber,
          profileImageKey: owner.profileImageKey,
          role: "SCHOOL_OWNER",
          status: "ACTIVE",
          passwordHash: owner.passwordHash,
        },
      });
      const teacher = await transaction.teacher.create({
        data: {
          id: teacherSnapshot.id,
          schoolId: school.id,
          userId: user.id,
          employeeCode: teacherSnapshot.employeeCode,
          firstName: owner.firstName,
          lastName: owner.lastName,
          isActive: true,
        },
      });
      const academicYear = await transaction.academicYear.create({
        data: {
          schoolId: school.id,
          name: "ปีการศึกษา 2569",
          startsOn: new Date("2026-05-01T00:00:00.000Z"),
          endsOn: new Date("2027-03-31T00:00:00.000Z"),
          isCurrent: true,
        },
      });
      const term = await transaction.term.create({
        data: {
          schoolId: school.id,
          academicYearId: academicYear.id,
          name: "ภาคเรียนที่ 1",
          startsOn: new Date("2026-05-01T00:00:00.000Z"),
          endsOn: new Date("2026-10-31T00:00:00.000Z"),
          isCurrent: true,
        },
      });
      await transaction.classroom.createMany({ data: classroomDefinitions.map((classroom) => ({ ...classroom, schoolId: school.id })) });
      await transaction.subject.createMany({ data: SUBJECTS.map(([code, name]) => ({ schoolId: school.id, code, name })) });
      await transaction.student.createMany({ data: rows.map((row) => ({
        schoolId: school.id,
        studentNumber: row["รหัสนักเรียน"],
        firstName: row["ชื่อ"],
        lastName: row["นามสกุล"],
      })) });

      const classrooms = await transaction.classroom.findMany({ where: { schoolId: school.id } });
      const subjects = await transaction.subject.findMany({ where: { schoolId: school.id } });
      const students = await transaction.student.findMany({ where: { schoolId: school.id } });
      const classroomByCode = new Map(classrooms.map((classroom) => [classroom.code, classroom]));
      const studentByNumber = new Map(students.map((student) => [student.studentNumber, student]));
      const subjectByCode = new Map(subjects.map((subject) => [subject.code, subject]));
      await transaction.classEnrollment.createMany({ data: rows.map((row) => {
        const classroom = classroomByCode.get(row["ห้อง"]);
        const student = studentByNumber.get(row["รหัสนักเรียน"]);
        if (!classroom || !student) throw new Error("Unable to resolve a CSV enrollment.");
        const rollNumber = Number.parseInt(row["เลขที่"], 10);
        if (!Number.isSafeInteger(rollNumber) || rollNumber < 1) throw new Error(`Invalid roll number for ${row["รหัสนักเรียน"]}.`);
        return { schoolId: school.id, termId: term.id, classroomId: classroom.id, studentId: student.id, rollNumber };
      }) });

      for (const entry of SCHEDULE) {
        const definition = classroomDefinitions[entry.classroomIndex];
        const subjectDefinition = SUBJECTS[entry.subjectIndex];
        if (!definition || !subjectDefinition) throw new Error("Invalid timetable fixture mapping.");
        const classroom = classroomByCode.get(definition.code);
        const subject = subjectByCode.get(subjectDefinition[0]);
        if (!classroom || !subject) throw new Error("Unable to resolve timetable context.");
        const assignment = await transaction.teachingAssignment.upsert({
          where: { schoolId_termId_teacherId_classroomId_subjectId: {
            schoolId: school.id,
            termId: term.id,
            teacherId: teacher.id,
            classroomId: classroom.id,
            subjectId: subject.id,
          } },
          update: {},
          create: { schoolId: school.id, termId: term.id, teacherId: teacher.id, classroomId: classroom.id, subjectId: subject.id },
        });
        await transaction.timetableEntry.create({ data: {
          schoolId: school.id,
          termId: term.id,
          teachingAssignmentId: assignment.id,
          teacherId: teacher.id,
          classroomId: classroom.id,
          subjectId: subject.id,
          weekday: entry.weekday,
          startTime: wallClock(entry.startTime),
          endTime: wallClock(entry.endTime),
          room: classroom.name,
        } });
      }
    }, { timeout: 120_000 });

    const result = await prisma.school.findFirstOrThrow({
      where: { workspaceType: "PERSONAL" },
      include: {
        _count: { select: { students: true, classrooms: true, subjects: true, teachingAssignments: true, timetableEntries: true } },
      },
    });
    console.info(JSON.stringify({
      status: "ready",
      timezone: result.timezone,
      students: result._count.students,
      classrooms: result._count.classrooms,
      subjects: result._count.subjects,
      teachingAssignments: result._count.teachingAssignments,
      timetableEntries: result._count.timetableEntries,
      weeklyPeriodUnits,
      doublePeriodEntries: SCHEDULE.filter((entry) => entry.periodUnits === 2).length,
    }));
  } finally {
    await prisma.$disconnect();
  }
}

await main();
