-- Add a stable, classroom-and-term scoped roll number without changing student identity.
ALTER TABLE "ClassEnrollment"
ADD COLUMN "rollNumber" INTEGER;

-- Existing synthetic/local rosters receive deterministic numbers ordered by learner name.
WITH ranked_enrollments AS (
  SELECT
    enrollment."id",
    ROW_NUMBER() OVER (
      PARTITION BY enrollment."schoolId", enrollment."termId", enrollment."classroomId"
      ORDER BY student."lastName", student."firstName", student."studentNumber", enrollment."id"
    )::INTEGER AS "rollNumber"
  FROM "ClassEnrollment" AS enrollment
  INNER JOIN "Student" AS student ON student."id" = enrollment."studentId"
)
UPDATE "ClassEnrollment" AS enrollment
SET "rollNumber" = ranked."rollNumber"
FROM ranked_enrollments AS ranked
WHERE enrollment."id" = ranked."id";

ALTER TABLE "ClassEnrollment"
ADD CONSTRAINT "ClassEnrollment_rollNumber_check"
CHECK ("rollNumber" IS NULL OR "rollNumber" > 0);

CREATE UNIQUE INDEX "ClassEnrollment_schoolId_termId_classroomId_rollNumber_key"
ON "ClassEnrollment"("schoolId", "termId", "classroomId", "rollNumber");
