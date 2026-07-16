import type { PrismaClient } from "../../src/generated/prisma/client.js";

const LOCAL_DATABASE_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function requireSafeIntegrationDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required. Copy packages/database/.env.example to packages/database/.env before running integration tests.",
    );
  }

  const parsedUrl = new URL(databaseUrl);
  const databaseName = parsedUrl.pathname.replace(/^\//, "");

  if (
    !["postgres:", "postgresql:"].includes(parsedUrl.protocol) ||
    !LOCAL_DATABASE_HOSTS.has(parsedUrl.hostname) ||
    databaseName !== "classroom_os"
  ) {
    throw new Error(
      "Integration tests only run against the local classroom_os PostgreSQL database.",
    );
  }

  return databaseUrl;
}

export async function cleanupSyntheticSchools(
  prisma: PrismaClient,
  schoolIds: ReadonlySet<string>,
): Promise<void> {
  if (schoolIds.size === 0) return;

  const schoolIdFilter = { in: [...schoolIds] };

  await prisma.authenticationEvent.deleteMany({ where: { schoolId: schoolIdFilter } });
  await prisma.authSession.deleteMany({ where: { schoolId: schoolIdFilter } });
  await prisma.auditLog.deleteMany({ where: { schoolId: schoolIdFilter } });
  await prisma.score.deleteMany({ where: { schoolId: schoolIdFilter } });
  await prisma.attendanceCorrection.deleteMany({ where: { schoolId: schoolIdFilter } });
  await prisma.attendanceRecord.deleteMany({ where: { schoolId: schoolIdFilter } });
  await prisma.assessment.deleteMany({ where: { schoolId: schoolIdFilter } });
  await prisma.sessionTimelineEvent.deleteMany({ where: { schoolId: schoolIdFilter } });
  await prisma.classSession.deleteMany({ where: { schoolId: schoolIdFilter } });
  await prisma.timetableEntry.deleteMany({ where: { schoolId: schoolIdFilter } });
  await prisma.teachingAssignment.deleteMany({ where: { schoolId: schoolIdFilter } });
  await prisma.classEnrollment.deleteMany({ where: { schoolId: schoolIdFilter } });
  await prisma.classroom.deleteMany({ where: { schoolId: schoolIdFilter } });
  await prisma.student.deleteMany({ where: { schoolId: schoolIdFilter } });
  await prisma.subject.deleteMany({ where: { schoolId: schoolIdFilter } });
  await prisma.teacher.deleteMany({ where: { schoolId: schoolIdFilter } });
  await prisma.user.deleteMany({ where: { schoolId: schoolIdFilter } });
  await prisma.term.deleteMany({ where: { schoolId: schoolIdFilter } });
  await prisma.academicYear.deleteMany({ where: { schoolId: schoolIdFilter } });
  await prisma.school.deleteMany({ where: { id: schoolIdFilter } });
}
