-- DropIndex
DROP INDEX "TimetableCoverage_schoolId_timetableEntryId_localDate_key";

-- Preserve declined/cancelled history while allowing only one actionable request.
CREATE UNIQUE INDEX "TimetableCoverage_actionable_entry_date_key"
ON "TimetableCoverage" ("schoolId", "timetableEntryId", "localDate")
WHERE "status" IN ('pending', 'active');
