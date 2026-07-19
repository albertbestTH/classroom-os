-- CreateEnum
CREATE TYPE "TimetableCoverageKind" AS ENUM ('cover', 'swap');

-- CreateEnum
CREATE TYPE "TimetableCoverageStatus" AS ENUM ('pending', 'active', 'declined', 'cancelled');

-- CreateTable
CREATE TABLE "TimetableCoverage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" UUID NOT NULL,
    "timetableEntryId" UUID NOT NULL,
    "reciprocalEntryId" UUID,
    "originalTeacherId" UUID NOT NULL,
    "substituteTeacherId" UUID NOT NULL,
    "localDate" DATE NOT NULL,
    "kind" "TimetableCoverageKind" NOT NULL DEFAULT 'cover',
    "status" "TimetableCoverageStatus" NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "requestedByUserId" UUID NOT NULL,
    "resolvedByUserId" UUID,
    "resolvedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "TimetableCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimetableCoverage_schoolId_substituteTeacherId_localDate_st_idx" ON "TimetableCoverage"("schoolId", "substituteTeacherId", "localDate", "status");

-- CreateIndex
CREATE INDEX "TimetableCoverage_schoolId_originalTeacherId_localDate_stat_idx" ON "TimetableCoverage"("schoolId", "originalTeacherId", "localDate", "status");

-- CreateIndex
CREATE INDEX "TimetableCoverage_schoolId_status_createdAt_idx" ON "TimetableCoverage"("schoolId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableCoverage_schoolId_timetableEntryId_localDate_key" ON "TimetableCoverage"("schoolId", "timetableEntryId", "localDate");

-- AddForeignKey
ALTER TABLE "TimetableCoverage" ADD CONSTRAINT "TimetableCoverage_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableCoverage" ADD CONSTRAINT "TimetableCoverage_timetableEntryId_fkey" FOREIGN KEY ("timetableEntryId") REFERENCES "TimetableEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableCoverage" ADD CONSTRAINT "TimetableCoverage_reciprocalEntryId_fkey" FOREIGN KEY ("reciprocalEntryId") REFERENCES "TimetableEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableCoverage" ADD CONSTRAINT "TimetableCoverage_originalTeacherId_fkey" FOREIGN KEY ("originalTeacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableCoverage" ADD CONSTRAINT "TimetableCoverage_substituteTeacherId_fkey" FOREIGN KEY ("substituteTeacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableCoverage" ADD CONSTRAINT "TimetableCoverage_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableCoverage" ADD CONSTRAINT "TimetableCoverage_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
