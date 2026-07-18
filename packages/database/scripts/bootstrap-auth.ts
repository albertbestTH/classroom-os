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
      { email: "teacher2@synthetic.classroom.test", firstName: "กานดา", lastName: "สังเคราะห์", role: "TEACHER" as const },
      { email: "teacher3@synthetic.classroom.test", firstName: "ปรีชา", lastName: "สังเคราะห์", role: "TEACHER" as const },
      { email: "teacher4@synthetic.classroom.test", firstName: "วารุณี", lastName: "สังเคราะห์", role: "TEACHER" as const },
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
    const teachers = [];
    for (let teacherIndex = 0; teacherIndex < 4; teacherIndex += 1) {
      const teacherUser = accounts[teacherIndex + 2];
      if (!teacherUser) throw new Error(`Synthetic teacher account ${teacherIndex + 1} was not created.`);
      const employeeCode = `SYN-T-${String(teacherIndex + 1).padStart(3, "0")}`;
      teachers.push(await prisma.teacher.upsert({
        where: { schoolId_employeeCode: { schoolId: school.id, employeeCode } },
        update: { userId: teacherUser.id, firstName: teacherUser.firstName, lastName: teacherUser.lastName, isActive: true },
        create: { schoolId: school.id, userId: teacherUser.id, employeeCode, firstName: teacherUser.firstName, lastName: teacherUser.lastName },
      }));
    }

    const classroomDefinitions = [
      ["SYN-A", "Synthetic Classroom A"],
      ["SYN-B", "Synthetic Classroom B"],
      ["SYN-C", "Synthetic Classroom C"],
      ["SYN-D", "Synthetic Classroom D"],
      ["SYN-E", "Synthetic Classroom E"],
      ["SYN-F", "Synthetic Classroom F"],
      ["SYN-G", "Synthetic Classroom G"],
      ["SYN-H", "Synthetic Classroom H"],
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
      ["SYN-THAI", "Synthetic Thai Language"],
      ["SYN-ENG", "Synthetic English"],
      ["SYN-SOC", "Synthetic Social Studies"],
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
    if (classrooms.length !== 8 || subjects.length !== 5 || teachers.length !== 4) {
      throw new Error("Synthetic authorization fixtures were not created.");
    }

    const syntheticFirstNames = [
      "กิตติ", "กมล", "ขวัญใจ", "จิรภัทร", "ชนากานต์", "ณัฐดนัย", "ณิชา", "ธนกฤต", "ธัญชนก", "นภัส",
      "ปภาวิน", "ปุณณภพ", "พราว", "พีรวิชญ์", "ภัทรา", "มณีรัตน์", "รวิภา", "วรัญญา", "ศิริน", "สรวิชญ์",
      "สุชาดา", "อภิชญา", "อริสรา", "อัญชลี", "อินทัช", "เขมิกา", "เจษฎา", "เมธาวี", "โยธิน", "ไอรดา",
    ] as const;
    const originalClassAStudents = [
      ["SYN-ST-001", "สมชาย", "ตัวอย่าง"],
      ["SYN-ST-002", "สมหญิง", "ทดสอบ"],
      ["SYN-ST-003", "กิตติ", "สังเคราะห์"],
    ] as const;
    const classroomRosters = classrooms.map((classroom, classroomIndex) => ({
      classroom,
      definitions: Array.from({ length: 30 }, (_, studentIndex) => {
        if (classroomIndex === 0 && studentIndex < originalClassAStudents.length) {
          return originalClassAStudents[studentIndex]!;
        }
        const classroomCode = String.fromCharCode(65 + classroomIndex);
        const sequence = String(studentIndex + 1).padStart(3, "0");
        return [
          `SYN-${classroomCode}-${sequence}`,
          syntheticFirstNames[studentIndex]!,
          `สังเคราะห์ ${classroomCode}${sequence}`,
        ] as const;
      }),
    }));
    for (const { classroom, definitions } of classroomRosters) {
      for (const [studentNumber, firstName, lastName] of definitions) {
        const student = await prisma.student.upsert({
          where: { schoolId_studentNumber: { schoolId: school.id, studentNumber } },
          update: { firstName, lastName, isActive: true },
          create: { schoolId: school.id, studentNumber, firstName, lastName },
        });
        await prisma.classEnrollment.upsert({
          where: { termId_classroomId_studentId: { termId: term.id, classroomId: classroom.id, studentId: student.id } },
          update: { schoolId: school.id, isActive: true, leftAt: null },
          create: { schoolId: school.id, termId: term.id, classroomId: classroom.id, studentId: student.id },
        });
      }
    }
    const rosterCounts = await Promise.all(classrooms.map((classroom) => prisma.classEnrollment.count({
      where: { schoolId: school.id, termId: term.id, classroomId: classroom.id, isActive: true, leftAt: null },
    })));
    if (rosterCounts.some((count) => count !== 30)) {
      throw new Error(`Synthetic classrooms must contain exactly 30 active students; found ${rosterCounts.join(", ")}.`);
    }

    // PostgreSQL `time` stores local wall-clock values without a timezone. These
    // values are interpreted using the school's Asia/Bangkok timezone by services.
    const timeSlots = [
      ["08:30", "09:20"],
      ["09:30", "10:20"],
      ["10:30", "11:20"],
      ["12:30", "13:20"],
      ["13:30", "14:20"],
    ] as const;
    const dailyLoads = [5, 5, 4, 4, 4] as const;
    await prisma.timetableEntry.updateMany({
      where: { schoolId: school.id, termId: term.id },
      data: { isActive: false },
    });
    const assignmentIds = new Map<string, string>();
    for (let teacherIndex = 0; teacherIndex < teachers.length; teacherIndex += 1) {
      const teacher = teachers[teacherIndex]!;
      for (let dayIndex = 0; dayIndex < dailyLoads.length; dayIndex += 1) {
        const weekday = dayIndex + 1;
        for (let slotIndex = 0; slotIndex < dailyLoads[dayIndex]!; slotIndex += 1) {
          const classroom = classrooms[(teacherIndex + dayIndex + slotIndex) % classrooms.length]!;
          const subject = subjects[(teacherIndex + dayIndex + slotIndex) % subjects.length]!;
          const assignmentKey = `${teacher.id}:${classroom.id}:${subject.id}`;
          let teachingAssignmentId = assignmentIds.get(assignmentKey);
          if (!teachingAssignmentId) {
            const assignment = await prisma.teachingAssignment.upsert({
              where: { schoolId_termId_teacherId_classroomId_subjectId: { schoolId: school.id, termId: term.id, teacherId: teacher.id, classroomId: classroom.id, subjectId: subject.id } },
              update: {},
              create: { schoolId: school.id, termId: term.id, teacherId: teacher.id, classroomId: classroom.id, subjectId: subject.id },
            });
            teachingAssignmentId = assignment.id;
            assignmentIds.set(assignmentKey, teachingAssignmentId);
          }
          const [startsAt, endsAt] = timeSlots[slotIndex]!;
          const startTime = new Date(`1970-01-01T${startsAt}:00.000Z`);
          const endTime = new Date(`1970-01-01T${endsAt}:00.000Z`);
          await prisma.timetableEntry.upsert({
            where: { schoolId_termId_weekday_startTime_teacherId: { schoolId: school.id, termId: term.id, weekday, startTime, teacherId: teacher.id } },
            update: { teachingAssignmentId, classroomId: classroom.id, subjectId: subject.id, endTime, room: classroom.code, isActive: true },
            create: { schoolId: school.id, termId: term.id, teachingAssignmentId, teacherId: teacher.id, classroomId: classroom.id, subjectId: subject.id, weekday, startTime, endTime, room: classroom.code },
          });
        }
      }
    }
    const weeklyLoads = await Promise.all(teachers.map((teacher) => prisma.timetableEntry.count({
      where: { schoolId: school.id, termId: term.id, teacherId: teacher.id, isActive: true },
    })));
    if (weeklyLoads.some((count) => count !== 22)) {
      throw new Error(`Synthetic teachers must have exactly 22 active periods; found ${weeklyLoads.join(", ")}.`);
    }

    console.info(`Synthetic fixtures are ready: ${teachers.length} teachers × 22 weekly periods, ${classrooms.length} classrooms × 30 students, timezone ${school.timezone}.`);
  } finally {
    await prisma.$disconnect();
  }
}

await main();
