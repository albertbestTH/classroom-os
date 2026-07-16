import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import DashboardError from "@/app/error";
import { ActionRequiredList } from "@/components/dashboard/action-required-list";
import { AttendanceDonutChart } from "@/components/dashboard/attendance-donut-chart";
import { AttendanceTrendChart } from "@/components/dashboard/attendance-trend-chart";
import { ClassroomComparisonChart } from "@/components/dashboard/classroom-comparison-chart";
import { DashboardLoadingState } from "@/components/dashboard/dashboard-loading-state";
import { SessionStatusChart } from "@/components/dashboard/session-status-chart";

describe("dashboard visualization states", () => {
  it("renders understandable empty chart states without relying on color", () => {
    const donut = renderToStaticMarkup(<AttendanceDonutChart totals={{ present: 0, late: 0, absent: 0, leave: 0, unrecorded: 0 }} eligibleCount={0} attendancePercentage={0} />);
    const trend = renderToStaticMarkup(<AttendanceTrendChart points={[{ date: "2026-07-16", attendedCount: 0, eligibleCount: 0, percentage: null, hasSessions: false }]} />);
    const comparison = renderToStaticMarkup(<ClassroomComparisonChart classrooms={[]} />);
    const sessions = renderToStaticMarkup(<SessionStatusChart totals={{ scheduled: 0, live: 0, completed: 0, cancelled: 0, missed: 0, attendanceIncomplete: 0 }} />);
    expect(donut).toContain("ยังไม่มีข้อมูลการเช็กชื่อวันนี้");
    expect(trend).toContain("ไม่ถูกนับเป็นการเข้าเรียน 0%");
    expect(comparison).toContain("แต่ละชั้นและวิชา");
    expect(sessions).toContain("วันนี้ยังไม่มีคาบเรียน");
  });

  it("renders loading, error/retry, and action link semantics", () => {
    const loading = renderToStaticMarkup(<DashboardLoadingState />);
    const error = renderToStaticMarkup(<DashboardError error={new Error("synthetic")} reset={() => undefined} />);
    const actions = renderToStaticMarkup(<ActionRequiredList actions={[{ id: "synthetic", type: "MISSED_CLASS", priority: "high", title: "คาบเรียนเลยเวลาเริ่ม", description: "Synthetic Classroom", href: "/timetable", classroomId: null, subjectId: null }]} />);
    expect(loading).toContain("กำลังโหลดข้อมูลและกราฟ");
    expect(error).toContain("ลองอีกครั้ง");
    expect(error).not.toContain("synthetic");
    expect(actions).toContain('href="/timetable"');
  });
});
