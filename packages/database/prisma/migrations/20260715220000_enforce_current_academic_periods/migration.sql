-- One current academic year and one current term are allowed per school.
-- These partial indexes complement the transactional service updates and close
-- the concurrent-writer gap without changing Prisma's portable schema model.
CREATE UNIQUE INDEX "AcademicYear_one_current_per_school"
ON "AcademicYear" ("schoolId")
WHERE "isCurrent" = true;

CREATE UNIQUE INDEX "Term_one_current_per_school"
ON "Term" ("schoolId")
WHERE "isCurrent" = true;
