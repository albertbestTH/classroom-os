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
    const accounts = await Promise.all(
      accountDefinitions.map((account) =>
        prisma.user.upsert({
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
      ),
    );
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
    const classrooms = await Promise.all(
      classroomDefinitions.map(([code, name]) =>
        prisma.classroom.upsert({
          where: { schoolId_code: { schoolId: school.id, code } },
          update: { name, gradeLevel: "TEST-5", isActive: true },
          create: { schoolId: school.id, code, name, gradeLevel: "TEST-5" },
        }),
      ),
    );
    const subjectDefinitions = [
      ["SYN-MATH", "Synthetic Mathematics"],
      ["SYN-SCI", "Synthetic Science"],
    ] as const;
    const subjects = await Promise.all(
      subjectDefinitions.map(([code, name]) =>
        prisma.subject.upsert({
          where: { schoolId_code: { schoolId: school.id, code } },
          update: { name, isActive: true },
          create: { schoolId: school.id, code, name },
        }),
      ),
    );
    const [classA, classB] = classrooms;
    const [math, science] = subjects;
    if (!classA || !classB || !math || !science) {
      throw new Error("Synthetic authorization fixtures were not created.");
    }
    for (const assignment of [
      { classroomId: classA.id, subjectId: math.id },
      { classroomId: classB.id, subjectId: math.id },
      { classroomId: classB.id, subjectId: science.id },
    ]) {
      await prisma.teachingAssignment.upsert({
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
    }

    console.info("Synthetic authentication fixtures are ready for local development.");
  } finally {
    await prisma.$disconnect();
  }
}

await main();
