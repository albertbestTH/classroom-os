-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SessionTimelineEventType" ADD VALUE 'ATTENDANCE_CORRECTED';
ALTER TYPE "SessionTimelineEventType" ADD VALUE 'SESSION_CANCELLED';

-- AlterTable
ALTER TABLE "ClassSession" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMPTZ(3),
ADD COLUMN     "cancelledById" UUID;

-- CreateTable
CREATE TABLE "AttendanceCorrection" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" UUID NOT NULL,
    "attendanceRecordId" UUID NOT NULL,
    "classSessionId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "actorUserId" UUID,
    "beforeStatus" "AttendanceStatus" NOT NULL,
    "afterStatus" "AttendanceStatus" NOT NULL,
    "beforeNote" TEXT,
    "afterNote" TEXT,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceCorrection_schoolId_classSessionId_createdAt_idx" ON "AttendanceCorrection"("schoolId", "classSessionId", "createdAt");

-- CreateIndex
CREATE INDEX "AttendanceCorrection_schoolId_studentId_createdAt_idx" ON "AttendanceCorrection"("schoolId", "studentId", "createdAt");

-- CreateIndex
CREATE INDEX "AttendanceCorrection_schoolId_attendanceRecordId_createdAt_idx" ON "AttendanceCorrection"("schoolId", "attendanceRecordId", "createdAt");

-- CreateIndex
CREATE INDEX "ClassSession_schoolId_status_cancelledAt_idx" ON "ClassSession"("schoolId", "status", "cancelledAt");

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrection" ADD CONSTRAINT "AttendanceCorrection_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrection" ADD CONSTRAINT "AttendanceCorrection_attendanceRecordId_fkey" FOREIGN KEY ("attendanceRecordId") REFERENCES "AttendanceRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrection" ADD CONSTRAINT "AttendanceCorrection_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrection" ADD CONSTRAINT "AttendanceCorrection_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrection" ADD CONSTRAINT "AttendanceCorrection_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
