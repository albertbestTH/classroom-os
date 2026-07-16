import { domainError } from "@classroom-os/database";
import type { DashboardOverviewFilters } from "@classroom-os/types";

const allowedKeys = new Set(["days", "termId", "teachingAssignmentId", "classroomId", "subjectId", "teacherId"]);

export function dashboardFiltersFromSearchParams(
  searchParams: URLSearchParams,
): DashboardOverviewFilters {
  for (const key of searchParams.keys()) {
    if (!allowedKeys.has(key)) {
      throw domainError("VALIDATION_ERROR", `Unsupported dashboard filter: ${key}.`);
    }
  }
  const daysValue = searchParams.get("days")?.trim();
  const termId = searchParams.get("termId")?.trim();
  const teachingAssignmentId = searchParams.get("teachingAssignmentId")?.trim();
  const classroomId = searchParams.get("classroomId")?.trim();
  const subjectId = searchParams.get("subjectId")?.trim();
  const teacherId = searchParams.get("teacherId")?.trim();
  return {
    ...(daysValue ? { days: Number(daysValue) as 7 | 30 } : {}),
    ...(termId ? { termId } : {}),
    ...(teachingAssignmentId ? { teachingAssignmentId } : {}),
    ...(classroomId ? { classroomId } : {}),
    ...(subjectId ? { subjectId } : {}),
    ...(teacherId ? { teacherId } : {}),
  };
}
