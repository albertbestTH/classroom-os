CREATE TABLE "SchoolHoliday" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" UUID NOT NULL,
    "localDate" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SchoolHoliday_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SchoolHoliday_schoolId_localDate_key" ON "SchoolHoliday"("schoolId", "localDate");
CREATE INDEX "SchoolHoliday_schoolId_localDate_isActive_idx" ON "SchoolHoliday"("schoolId", "localDate", "isActive");
CREATE INDEX "SchoolHoliday_schoolId_isActive_idx" ON "SchoolHoliday"("schoolId", "isActive");

ALTER TABLE "SchoolHoliday"
ADD CONSTRAINT "SchoolHoliday_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
