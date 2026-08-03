import "dotenv/config";

import { createPrismaClient } from "../src/client.js";

const UAT_SCHOOL_CODE = "UAT-CLASSROOM-OS";
if (process.env.CLASSROOM_OS_ENV !== "staging") throw new Error("UAT verification requires CLASSROOM_OS_ENV=staging.");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const url = new URL(databaseUrl);
if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("UAT verification refuses localhost databases.");
const prisma = createPrismaClient(databaseUrl);
try {
  const school = await prisma.school.findUnique({ where: { code: UAT_SCHOOL_CODE }, include: { _count: { select: { users: true, teachers: true, students: true, classrooms: true, subjects: true, classEnrollments: true, teachingAssignments: true, timetableEntries: true, classSessions: true } } } });
  if (!school) throw new Error("UAT school was not found. Run db:seed:uat first.");
  const teachers = await prisma.user.findMany({ where: { schoolId: school.id, role: "TEACHER" }, select: { email: true }, orderBy: { email: "asc" } });
  if (school.workspaceType !== "SCHOOL" || school.timezone !== "Asia/Bangkok" || school._count.teachers !== 5 || school._count.classrooms !== 6 || school._count.students !== 144 || school._count.timetableEntries !== 15) throw new Error("UAT counts or tenant settings do not match the deterministic fixture.");
  console.info(JSON.stringify({ status: "ready", schoolCode: school.code, schoolId: school.id, timezone: school.timezone, counts: school._count, teacherAccounts: teachers.map((teacher) => teacher.email) }));
} finally { await prisma.$disconnect(); }
