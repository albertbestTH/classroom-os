import type { SessionAttendanceResult } from "@classroom-os/types";

import { buildAttendanceBatch } from "@/features/attendance/build-attendance-batch";

const students = [
  { studentId: "student-a", status: null },
  { studentId: "student-b", status: "late" },
] as SessionAttendanceResult["students"];

describe("attendance draft batching", () => {
  it("sends only explicit changes and never assumes present", () => {
    expect(buildAttendanceBatch(students, { "student-b": "absent" })).toEqual([
      { studentId: "student-b", status: "absent" },
    ]);
  });

  it("supports the explicit mark-all-present action", () => {
    expect(buildAttendanceBatch(students, { "student-a": "present", "student-b": "present" })).toEqual([
      { studentId: "student-a", status: "present" },
      { studentId: "student-b", status: "present" },
    ]);
  });
});
