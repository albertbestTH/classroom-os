CREATE TABLE "ScoreCategory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "teachingAssignmentId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreCategory_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Assessment"
ADD COLUMN "teachingAssignmentId" UUID,
ADD COLUMN "categoryId" UUID,
ADD COLUMN "assessmentDate" DATE NOT NULL DEFAULT CURRENT_DATE;

INSERT INTO "ScoreCategory" (
    "schoolId",
    "termId",
    "teachingAssignmentId",
    "name"
)
SELECT
    "schoolId",
    "termId",
    "id",
    'คะแนนทั่วไป'
FROM "TeachingAssignment";

UPDATE "Assessment" AS assessment
SET
    "teachingAssignmentId" = assignment."id",
    "categoryId" = category."id",
    "assessmentDate" = COALESCE(assessment."dueAt"::date, assessment."createdAt"::date)
FROM "TeachingAssignment" AS assignment
JOIN "ScoreCategory" AS category
  ON category."schoolId" = assignment."schoolId"
 AND category."teachingAssignmentId" = assignment."id"
 AND category."name" = 'คะแนนทั่วไป'
WHERE assessment."schoolId" = assignment."schoolId"
  AND assessment."termId" = assignment."termId"
  AND assessment."teacherId" = assignment."teacherId"
  AND assessment."classroomId" = assignment."classroomId"
  AND assessment."subjectId" = assignment."subjectId";

ALTER TABLE "Assessment"
ALTER COLUMN "teachingAssignmentId" SET NOT NULL,
ALTER COLUMN "categoryId" SET NOT NULL;

CREATE UNIQUE INDEX "ScoreCategory_schoolId_teachingAssignmentId_name_key"
ON "ScoreCategory"("schoolId", "teachingAssignmentId", "name");

CREATE INDEX "ScoreCategory_schoolId_termId_teachingAssignmentId_idx"
ON "ScoreCategory"("schoolId", "termId", "teachingAssignmentId");

CREATE INDEX "Assessment_schoolId_teachingAssignmentId_assessmentDate_idx"
ON "Assessment"("schoolId", "teachingAssignmentId", "assessmentDate");

CREATE INDEX "Assessment_schoolId_categoryId_assessmentDate_idx"
ON "Assessment"("schoolId", "categoryId", "assessmentDate");

ALTER TABLE "ScoreCategory"
ADD CONSTRAINT "ScoreCategory_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ScoreCategory"
ADD CONSTRAINT "ScoreCategory_termId_fkey"
FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ScoreCategory"
ADD CONSTRAINT "ScoreCategory_teachingAssignmentId_fkey"
FOREIGN KEY ("teachingAssignmentId") REFERENCES "TeachingAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Assessment"
ADD CONSTRAINT "Assessment_teachingAssignmentId_fkey"
FOREIGN KEY ("teachingAssignmentId") REFERENCES "TeachingAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Assessment"
ADD CONSTRAINT "Assessment_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "ScoreCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
