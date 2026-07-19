import "dotenv/config";

import { createPrismaClient } from "../src/client.js";

const SAFE_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function requireSafeDatabaseUrl(): string {
  if (process.env.NODE_ENV === "production") throw new Error("E2E preparation is disabled in production.");
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  const parsed = new URL(databaseUrl);
  if (!SAFE_HOSTS.has(parsed.hostname) || parsed.pathname.replace(/^\//, "") !== "classroom_os") {
    throw new Error("E2E preparation only runs against the local classroom_os database.");
  }
  return databaseUrl;
}

const prisma = createPrismaClient(requireSafeDatabaseUrl());
try {
  const teacher = await prisma.teacher.findFirst({
    where: { school: { code: "SYN-AUTH" }, user: { email: "teacher@synthetic.classroom.test" }, isActive: true },
    select: { schoolId: true, id: true },
  });
  if (!teacher) throw new Error("Synthetic teacher fixture is missing. Run db:bootstrap:auth first.");

  const assignment = await prisma.teachingAssignment.findFirst({
    where: { schoolId: teacher.schoolId, teacherId: teacher.id },
    orderBy: { createdAt: "asc" },
  });
  if (!assignment) throw new Error("Synthetic teaching assignment fixture is missing.");

  await prisma.timetableEntry.deleteMany({ where: { schoolId: teacher.schoolId, room: "SYN-E2E" } });
  await prisma.timetableEntry.create({
    data: {
      schoolId: teacher.schoolId,
      termId: assignment.termId,
      teachingAssignmentId: assignment.id,
      teacherId: assignment.teacherId,
      classroomId: assignment.classroomId,
      subjectId: assignment.subjectId,
      weekday: 1,
      startTime: new Date("1970-01-01T06:00:00.000Z"),
      endTime: new Date("1970-01-01T06:30:00.000Z"),
      room: "SYN-E2E",
    },
  });
  console.info("Synthetic E2E timetable entry is ready for the next Monday.");
} finally {
  await prisma.$disconnect();
}
