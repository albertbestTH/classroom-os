import type { AttendanceStatus, SessionAttendanceResult } from "@classroom-os/types";

type AttendanceStudent = SessionAttendanceResult["students"][number];

export function buildAttendanceBatch(
  students: AttendanceStudent[],
  draft: Record<string, AttendanceStatus>,
) {
  return students.flatMap((student) => {
    const status = draft[student.studentId];
    if (!status || status === student.status) return [];
    return [{ studentId: student.studentId, status }];
  });
}
