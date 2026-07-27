import type { AttendanceStatus } from "./index.js";

export type AttendanceSummaryInput = {
  enrolledCount: number;
  students: ReadonlyArray<{ status: AttendanceStatus | null }>;
};

export type AttendanceSummary = {
  enrolled: number; recorded: number; unrecorded: number;
  present: number; late: number; leave: number; absent: number;
  completionPercentage: number; presentPercentage: number; latePercentage: number;
  leavePercentage: number; absentPercentage: number; unrecordedPercentage: number;
};

const percentage = (count: number, total: number) => total > 0 ? Math.round(count / total * 1_000) / 10 : 0;

export function summarizeAttendance(input: AttendanceSummaryInput): AttendanceSummary {
  const counts = { present: 0, late: 0, leave: 0, absent: 0 };
  for (const student of input.students) if (student.status) counts[student.status] += 1;
  const enrolled = Math.max(0, input.enrolledCount);
  const recorded = counts.present + counts.late + counts.leave + counts.absent;
  const unrecorded = Math.max(0, enrolled - recorded);
  return {
    enrolled, recorded, unrecorded, ...counts,
    completionPercentage: percentage(recorded, enrolled),
    presentPercentage: percentage(counts.present, enrolled),
    latePercentage: percentage(counts.late, enrolled),
    leavePercentage: percentage(counts.leave, enrolled),
    absentPercentage: percentage(counts.absent, enrolled),
    unrecordedPercentage: percentage(unrecorded, enrolled),
  };
}

export function formatAttendancePercentage(value: number): string {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}%`;
}
