import type { SessionAttendanceResult } from "@classroom-os/types";

import { attendanceActionLabel, summarizeAttendance } from "@/features/attendance/attendance-summary";

function roster(statuses: SessionAttendanceResult["students"][number]["status"][]): SessionAttendanceResult {
  return {
    sessionId: "session-1", classroomId: "class-1", status: "live",
    enrolledCount: statuses.length, recordedCount: statuses.filter(Boolean).length,
    students: statuses.map((status, index) => ({
      studentId: `student-${index}`, studentNumber: `${index + 1}`,
      firstName: "Synthetic", lastName: `Student ${index}`, preferredName: null,
      profileImageKey: null, status, note: null, recordedAt: null,
      recordUpdatedAt: null, corrections: [],
    })),
  };
}

describe("attendance summary", () => {
  it("counts every explicit status and excludes unrecorded students", () => {
    expect(summarizeAttendance(roster(["present", "present", "late", "leave", "absent", null]))).toMatchObject({
      enrolled: 6, recorded: 5, unrecorded: 1, present: 2, late: 1, leave: 1, absent: 1,
      completionPercentage: 83.3, presentPercentage: 33.3, unrecordedPercentage: 16.7,
    });
  });

  it("handles complete, partial, and zero-student rosters", () => {
    expect(summarizeAttendance(roster(["present"])).recorded).toBe(1);
    expect(summarizeAttendance(roster(["present", null])).recorded).toBe(1);
    expect(summarizeAttendance(roster([]))).toMatchObject({ enrolled: 0, recorded: 0, unrecorded: 0, completionPercentage: 0, presentPercentage: 0 });
  });

  it("handles all-present, all-absent, and stable rounding without treating unrecorded as present", () => {
    expect(summarizeAttendance(roster(["present", "present"]))).toMatchObject({ presentPercentage: 100, completionPercentage: 100 });
    expect(summarizeAttendance(roster(["absent", "absent"]))).toMatchObject({ absentPercentage: 100, presentPercentage: 0 });
    expect(summarizeAttendance(roster(["present", "present", null]))).toMatchObject({ presentPercentage: 66.7, unrecordedPercentage: 33.3, present: 2 });
  });
});

describe("attendance action label", () => {
  it.each([
    [0, 30, "live", "เช็กชื่อ"],
    [12, 30, "live", "เช็กชื่อต่อ"],
    [30, 30, "live", "✓ เช็กชื่อแล้ว"],
    [0, 0, "live", "เช็กชื่อ"],
    [30, 30, "completed", "ดูการเช็กชื่อ"],
  ] as const)("maps %s/%s %s to %s", (recorded, enrolled, status, expected) => {
    expect(attendanceActionLabel({ recorded, enrolled }, status)).toBe(expected);
  });
});
