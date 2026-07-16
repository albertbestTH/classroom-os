-- CreateEnum
CREATE TYPE "SessionTimelineEventType" AS ENUM ('SESSION_STARTED', 'ATTENDANCE_UPDATED', 'SESSION_ENDED');

-- AlterTable
ALTER TABLE "ClassSession" ADD COLUMN "teachingAssignmentId" UUID;

-- AlterTable
ALTER TABLE "TimetableEntry" ADD COLUMN "teachingAssignmentId" UUID;

-- Preserve the exact term/teacher/classroom/subject lineage for existing rows.
UPDATE "TimetableEntry" AS timetable
SET "teachingAssignmentId" = assignment."id"
FROM "TeachingAssignment" AS assignment
WHERE assignment."schoolId" = timetable."schoolId"
  AND assignment."termId" = timetable."termId"
  AND assignment."teacherId" = timetable."teacherId"
  AND assignment."classroomId" = timetable."classroomId"
  AND assignment."subjectId" = timetable."subjectId";

UPDATE "ClassSession" AS session
SET "teachingAssignmentId" = assignment."id"
FROM "TeachingAssignment" AS assignment
WHERE assignment."schoolId" = session."schoolId"
  AND assignment."termId" = session."termId"
  AND assignment."teacherId" = session."teacherId"
  AND assignment."classroomId" = session."classroomId"
  AND assignment."subjectId" = session."subjectId";

ALTER TABLE "TimetableEntry" ALTER COLUMN "teachingAssignmentId" SET NOT NULL;
ALTER TABLE "ClassSession" ALTER COLUMN "teachingAssignmentId" SET NOT NULL;

-- CreateTable
CREATE TABLE "SessionTimelineEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" UUID NOT NULL,
    "classSessionId" UUID NOT NULL,
    "actorUserId" UUID,
    "eventType" "SessionTimelineEventType" NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionTimelineEvent_schoolId_classSessionId_createdAt_idx" ON "SessionTimelineEvent"("schoolId", "classSessionId", "createdAt");

-- CreateIndex
CREATE INDEX "SessionTimelineEvent_schoolId_createdAt_idx" ON "SessionTimelineEvent"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "ClassSession_schoolId_teachingAssignmentId_scheduledStart_idx" ON "ClassSession"("schoolId", "teachingAssignmentId", "scheduledStart");

-- Transactional service checks provide useful errors; this index closes the race
-- between concurrent attempts to start two sessions for the same teacher.
CREATE UNIQUE INDEX "ClassSession_one_live_session_per_teacher_idx"
ON "ClassSession"("teacherId") WHERE "status" = 'live';

-- CreateIndex
CREATE INDEX "TimetableEntry_schoolId_teachingAssignmentId_weekday_idx" ON "TimetableEntry"("schoolId", "teachingAssignmentId", "weekday");

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_teachingAssignmentId_fkey" FOREIGN KEY ("teachingAssignmentId") REFERENCES "TeachingAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_teachingAssignmentId_fkey" FOREIGN KEY ("teachingAssignmentId") REFERENCES "TeachingAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionTimelineEvent" ADD CONSTRAINT "SessionTimelineEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionTimelineEvent" ADD CONSTRAINT "SessionTimelineEvent_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionTimelineEvent" ADD CONSTRAINT "SessionTimelineEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
