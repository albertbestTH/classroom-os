import "dotenv/config";

import { createPrismaClient } from "../src/client.js";

const SAFE_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function requireSafeDatabaseUrl(): string {
  if (process.env.NODE_ENV === "production") throw new Error("E2E cleanup is disabled in production.");
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  const parsed = new URL(databaseUrl);
  if (!SAFE_HOSTS.has(parsed.hostname) || parsed.pathname.replace(/^\//, "") !== "classroom_os") {
    throw new Error("E2E cleanup only runs against the local classroom_os database.");
  }
  return databaseUrl;
}

const prisma = createPrismaClient(requireSafeDatabaseUrl());
try {
  const school = await prisma.school.findUnique({ where: { code: "SYN-AUTH" }, select: { id: true } });
  if (school) {
    const sessions = await prisma.classSession.findMany({
      where: { schoolId: school.id, timetableEntry: { room: "SYN-E2E" } },
      select: { id: true },
    });
    const ids = sessions.map(({ id }) => id);
    if (ids.length) {
      await prisma.attendanceCorrection.deleteMany({ where: { schoolId: school.id, classSessionId: { in: ids } } });
      await prisma.attendanceRecord.deleteMany({ where: { schoolId: school.id, classSessionId: { in: ids } } });
      await prisma.sessionTimelineEvent.deleteMany({ where: { schoolId: school.id, classSessionId: { in: ids } } });
      await prisma.auditLog.deleteMany({ where: { schoolId: school.id } });
      await prisma.classSession.deleteMany({ where: { schoolId: school.id, id: { in: ids } } });
    }
  }
  console.info("Synthetic E2E session data was cleaned up.");
} finally {
  await prisma.$disconnect();
}
