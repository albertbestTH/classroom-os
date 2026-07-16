import "dotenv/config";

import { createPrismaClient } from "../src/client.js";
import { hashPassword } from "../src/auth/password.js";

const SAFE_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const SYNTHETIC_PASSWORD = "Classroom!Demo2026";

function requireSafeDatabaseUrl(): string {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Authentication bootstrap is disabled in production.");
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  const parsed = new URL(databaseUrl);
  if (!SAFE_HOSTS.has(parsed.hostname) || parsed.pathname.replace(/^\//, "") !== "classroom_os") {
    throw new Error("Authentication bootstrap only runs against the local classroom_os database.");
  }
  return databaseUrl;
}

async function main(): Promise<void> {
  const prisma = createPrismaClient(requireSafeDatabaseUrl());
  try {
    const passwordHash = await hashPassword(SYNTHETIC_PASSWORD);
    const school = await prisma.school.upsert({
      where: { code: "SYN-AUTH" },
      update: { name: "Synthetic Authentication Academy", isActive: true },
      create: {
        code: "SYN-AUTH",
        name: "Synthetic Authentication Academy",
        timezone: "Asia/Bangkok",
      },
    });
    const academicYear = await prisma.academicYear.upsert({
      where: { schoolId_name: { schoolId: school.id, name: "Synthetic 2026" } },
      update: { isCurrent: true },
      create: {
        schoolId: school.id,
        name: "Synthetic 2026",
        startsOn: new Date("2026-05-01T00:00:00.000Z"),
        endsOn: new Date("2027-03-31T00:00:00.000Z"),
        isCurrent: true,
      },
    });
    const term = await prisma.term.upsert({
      where: {
        academicYearId_name: {
          academicYearId: academicYear.id,
          name: "Synthetic Term 1",
        },
      },
      update: { isCurrent: true },
      create: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        name: "Synthetic Term 1",
        startsOn: new Date("2026-05-01T00:00:00.000Z"),
        endsOn: new Date("2026-09-30T00:00:00.000Z"),
        isCurrent: true,
      },
    });

    const accountDefinitions = [
      { email: "owner@synthetic.classroom.test", firstName: "Synthetic", lastName: "Owner", role: "SCHOOL_OWNER" as const },
      { email: "admin@synthetic.classroom.test", firstName: "Synthetic", lastName: "Admin", role: "ADMIN" as const },
      { email: "teacher@synthetic.classroom.test", firstName: "Synthetic", lastName: "Teacher", role: "TEACHER" as const },
    ];
    const accounts = [];
    for (const account of accountDefinitions) {
      accounts.push(
        await prisma.user.upsert({
          where: { email: account.email },
          update: {
            schoolId: school.id,
            firstName: account.firstName,
            lastName: account.lastName,
            role: account.role,
            status: "ACTIVE",
            passwordHash,
          },
          create: { ...account, schoolId: school.id, status: "ACTIVE", passwordHash },
        }),
      );
    }
    const teacherUser = accounts[2];
    if (!teacherUser) throw new Error("Synthetic teacher account was not created.");
    const teacher = await prisma.teacher.upsert({
      where: { schoolId_employeeCode: { schoolId: school.id, employeeCode: "SYN-T-001" } },
      update: { userId: teacherUser.id, isActive: true },
      create: {
        schoolId: school.id,
        userId: teacherUser.id,
        employeeCode: "SYN-T-001",
        firstName: "Synthetic",
        lastName: "Teacher",
      },
    });

    const classroomDefinitions = [
      ["SYN-A", "Synthetic Classroom A"],
      ["SYN-B", "Synthetic Classroom B"],
      ["SYN-C", "Synthetic Classroom C (unassigned)"],
    ] as const;
    const classrooms = [];
    for (const [code, name] of classroomDefinitions) {
      classrooms.push(
        await prisma.classroom.upsert({
          where: { schoolId_code: { schoolId: school.id, code } },
          update: { name, gradeLevel: "TEST-5", isActive: true },
          create: { schoolId: school.id, code, name, gradeLevel: "TEST-5" },
        }),
      );
    }
    const subjectDefinitions = [
      ["SYN-MATH", "Synthetic Mathematics"],
      ["SYN-SCI", "Synthetic Science"],
    ] as const;
    const subjects = [];
    for (const [code, name] of subjectDefinitions) {
      subjects.push(
        await prisma.subject.upsert({
          where: { schoolId_code: { schoolId: school.id, code } },
          update: { name, isActive: true },
          create: { schoolId: school.id, code, name },
        }),
      );
    }
    const [classA, classB] = classrooms;
    const [math, science] = subjects;
    if (!classA || !classB || !math || !science) {
      throw new Error("Synthetic authorization fixtures were not created.");
    }
    let classAMathAssignmentId = "";
    for (const assignment of [
      { classroomId: classA.id, subjectId: math.id },
      { classroomId: classB.id, subjectId: math.id },
      { classroomId: classB.id, subjectId: science.id },
    ]) {
      const created = await prisma.teachingAssignment.upsert({
        where: {
          schoolId_termId_teacherId_classroomId_subjectId: {
            schoolId: school.id,
            termId: term.id,
            teacherId: teacher.id,
            ...assignment,
          },
        },
        update: {},
        create: {
          schoolId: school.id,
          termId: term.id,
          teacherId: teacher.id,
          ...assignment,
        },
      });
      if (assignment.classroomId === classA.id && assignment.subjectId === math.id) {
        classAMathAssignmentId = created.id;
      }
    }

    const students = [];
    for (const definition of [
      ["SYN-ST-001", "สมชาย", "ตัวอย่าง"],
      ["SYN-ST-002", "สมหญิง", "ทดสอบ"],
      ["SYN-ST-003", "กิตติ", "สังเคราะห์"],
    ] as const) {
      students.push(await prisma.student.upsert({
        where: { schoolId_studentNumber: { schoolId: school.id, studentNumber: definition[0] } },
        update: { firstName: definition[1], lastName: definition[2], isActive: true },
        create: { schoolId: school.id, studentNumber: definition[0], firstName: definition[1], lastName: definition[2] },
      }));
    }
    for (const student of students) {
      await prisma.classEnrollment.upsert({
        where: { termId_classroomId_studentId: { termId: term.id, classroomId: classA.id, studentId: student.id } },
        update: { schoolId: school.id, isActive: true, leftAt: null },
        create: { schoolId: school.id, termId: term.id, classroomId: classA.id, studentId: student.id },
      });
    }

    const localDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: school.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const [year, month, day] = localDate.split("-").map(Number);
    const jsWeekday = new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay();
    const weekday = jsWeekday === 0 ? 7 : jsWeekday;
    if (!classAMathAssignmentId) throw new Error("Synthetic class assignment is missing.");
    const e2eTimetable = await prisma.timetableEntry.upsert({
      where: {
        schoolId_termId_weekday_startTime_classroomId: {
          schoolId: school.id,
          termId: term.id,
          weekday,
          startTime: new Date("1970-01-01T23:00:00.000Z"),
          classroomId: classA.id,
        },
      },
      update: { teachingAssignmentId: classAMathAssignmentId, teacherId: teacher.id, subjectId: math.id, endTime: new Date("1970-01-01T23:50:00.000Z"), room: "SYN-E2E", isActive: true },
      create: { schoolId: school.id, termId: term.id, teachingAssignmentId: classAMathAssignmentId, teacherId: teacher.id, classroomId: classA.id, subjectId: math.id, weekday, startTime: new Date("1970-01-01T23:00:00.000Z"), endTime: new Date("1970-01-01T23:50:00.000Z"), room: "SYN-E2E" },
    });
    const staleSessions = await prisma.classSession.findMany({
      where: { schoolId: school.id, timetableEntryId: e2eTimetable.id },
      select: { id: true },
    });
    const staleSessionIds = staleSessions.map(({ id }) => id);
    if (staleSessionIds.length) {
      await prisma.attendanceCorrection.deleteMany({ where: { schoolId: school.id, classSessionId: { in: staleSessionIds } } });
      await prisma.attendanceRecord.deleteMany({ where: { schoolId: school.id, classSessionId: { in: staleSessionIds } } });
      await prisma.sessionTimelineEvent.deleteMany({ where: { schoolId: school.id, classSessionId: { in: staleSessionIds } } });
      await prisma.auditLog.deleteMany({ where: { schoolId: school.id } });
      await prisma.classSession.deleteMany({ where: { schoolId: school.id, id: { in: staleSessionIds } } });
    }

    console.info("Synthetic authentication fixtures are ready for local development.");
  } finally {
    await prisma.$disconnect();
  }
}

await main();
