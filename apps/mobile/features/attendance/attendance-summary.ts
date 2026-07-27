import { summarizeAttendance as summarizeSharedAttendance, type AttendanceSummary, type SessionAttendanceResult, type SessionStatus } from "@classroom-os/types";

export type { AttendanceSummary } from "@classroom-os/types";

export function summarizeAttendance(
  roster: Pick<SessionAttendanceResult, "students" | "enrolledCount">,
): AttendanceSummary {
  return summarizeSharedAttendance(roster);
}

export function attendanceActionLabel(
  summary: Pick<AttendanceSummary, "enrolled" | "recorded">,
  status: SessionStatus,
): string {
  if (status !== "live") return "ดูการเช็กชื่อ";
  if (summary.enrolled > 0 && summary.recorded >= summary.enrolled) return "✓ เช็กชื่อแล้ว";
  if (summary.recorded > 0) return "เช็กชื่อต่อ";
  return "เช็กชื่อ";
}
