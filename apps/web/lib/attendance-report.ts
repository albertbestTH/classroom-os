import type { AttendanceReportFilters } from "@classroom-os/types";

export function attendanceReportFiltersFromSearchParams(
  searchParams: URLSearchParams,
): AttendanceReportFilters {
  const filters: AttendanceReportFilters = {};
  for (const key of [
    "termId",
    "classroomId",
    "subjectId",
    "teacherId",
    "from",
    "to",
  ] as const) {
    const value = searchParams.get(key)?.trim();
    if (value) filters[key] = value;
  }
  return filters;
}
