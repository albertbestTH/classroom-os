import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AttendanceDashboard } from "@/components/classroom/attendance-dashboard";
import { attendanceActionLabel, summarizeAttendance } from "@/lib/attendance-summary";

describe("live attendance presentation", () => {
  it.each([
    [0, 30, "live", "เช็กชื่อ"],
    [12, 30, "live", "เช็กชื่อต่อ"],
    [30, 30, "live", "✓ เช็กชื่อแล้ว"],
    [0, 0, "live", "เช็กชื่อ"],
    [30, 30, "completed", "ดูการเช็กชื่อ"],
  ] as const)("maps %s/%s %s", (recorded, enrolled, status, expected) => {
    expect(attendanceActionLabel({ recorded, enrolled }, status)).toBe(expected);
  });

  it("calculates and renders a visual, accessible dashboard", () => {
    const summary = summarizeAttendance({ enrolledCount: 4, students: [
      { status: "present" }, { status: "late" }, { status: "leave" }, { status: null },
    ] } as never);
    expect(summary).toMatchObject({ enrolled: 4, recorded: 3, present: 1, late: 1, leave: 1, absent: 0 });
    const html = renderToStaticMarkup(<AttendanceDashboard summary={summary} />);
    expect(html).toContain("ภาพรวมการเข้าเรียน");
    expect(html).toContain("role=\"progressbar\"");
    expect(html).toContain("ยังไม่บันทึก");
    expect(html).toContain("25%");
    expect(html).toContain("บันทึกเช็กชื่อแล้ว 3/4 คน");
    expect(html).not.toContain(">100%<");
  });

  it("renders a safe zero-enrollment state", () => {
    const html = renderToStaticMarkup(<AttendanceDashboard summary={summarizeAttendance({ enrolledCount: 0, students: [] } as never)} />);
    expect(html).toContain("ยังไม่มีนักเรียนในชั้นเรียน");
    expect(html).not.toContain("NaN");
  });
});
