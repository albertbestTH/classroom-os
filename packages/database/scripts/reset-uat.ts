import "dotenv/config";

import { createPrismaClient } from "../src/client.js";

const UAT_SCHOOL_CODE = "UAT-CLASSROOM-OS";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function databaseUrl(): string {
  if (process.env.CLASSROOM_OS_ENV !== "staging" || process.env.UAT_SEED_CONFIRM !== "CLASSROOM-OS-UAT") throw new Error("UAT reset requires CLASSROOM_OS_ENV=staging and UAT_SEED_CONFIRM=CLASSROOM-OS-UAT.");
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is required.");
  const url = new URL(value);
  if (LOCAL_HOSTS.has(url.hostname)) throw new Error("UAT reset refuses localhost databases.");
  return value;
}

const prisma = createPrismaClient(databaseUrl());
try {
  const school = await prisma.school.findUnique({ where: { code: UAT_SCHOOL_CODE }, select: { id: true } });
  if (!school) { console.info(JSON.stringify({ status: "clean", schoolCode: UAT_SCHOOL_CODE })); }
  else {
    await prisma.$transaction(async (tx) => {
      const where = { schoolId: school.id };
      await tx.score.deleteMany({ where }); await tx.attendanceCorrection.deleteMany({ where }); await tx.attendanceRecord.deleteMany({ where }); await tx.sessionTimelineEvent.deleteMany({ where }); await tx.classSession.deleteMany({ where }); await tx.timetableCoverage.deleteMany({ where }); await tx.timetableEntry.deleteMany({ where }); await tx.teachingAssignment.deleteMany({ where }); await tx.classEnrollment.deleteMany({ where }); await tx.assessment.deleteMany({ where }); await tx.passwordResetRequest.deleteMany({ where }); await tx.emailChangeRequest.deleteMany({ where }); await tx.authSession.deleteMany({ where }); await tx.authenticationEvent.deleteMany({ where }); await tx.auditLog.deleteMany({ where }); await tx.schoolHoliday.deleteMany({ where }); await tx.student.deleteMany({ where }); await tx.classroom.deleteMany({ where }); await tx.subject.deleteMany({ where }); await tx.term.deleteMany({ where }); await tx.academicYear.deleteMany({ where }); await tx.teacher.deleteMany({ where }); await tx.user.deleteMany({ where }); await tx.school.delete({ where: { id: school.id } });
    }, { timeout: 120_000 });
    console.info(JSON.stringify({ status: "clean", schoolCode: UAT_SCHOOL_CODE, schoolId: school.id }));
  }
} finally { await prisma.$disconnect(); }
