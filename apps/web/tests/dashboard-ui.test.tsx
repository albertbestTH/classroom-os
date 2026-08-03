import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import DashboardError from "@/app/error";
import { ActionRequiredList } from "@/components/dashboard/action-required-list";
import { AttendanceDonutChart } from "@/components/dashboard/attendance-donut-chart";
import { AttendanceTrendChart } from "@/components/dashboard/attendance-trend-chart";
import { ClassroomComparisonChart } from "@/components/dashboard/classroom-comparison-chart";
import { DashboardLoadingState } from "@/components/dashboard/dashboard-loading-state";
import { SessionStatusChart } from "@/components/dashboard/session-status-chart";
import { getAttendanceActionState, QuickActions } from "@/components/dashboard/quick-actions";
import type { TodayClassResult } from "@classroom-os/types";

const attendanceClass = (recorded: number, enrolled: number) => ({
  session: { id: "session-1", classroomId: "classroom-1", enrolledStudentCount: enrolled, attendanceRecordedCount: recorded },
} as TodayClassResult);

describe("dashboard visualization states", () => {
  it("keeps the teacher dashboard composition single-instance", () => {
    const source = readFileSync(resolve(process.cwd(), "app/page.tsx"), "utf8");
    expect((source.match(/title="ทางลัด"/g) ?? []).length).toBe(1);
    expect((source.match(/title="ภาพรวมการเข้าเรียนวันนี้"/g) ?? []).length).toBe(1);
    expect((source.match(/<TodaySchedule\b/g) ?? []).length).toBe(1);
    expect((source.match(/title="ภาพรวมการเข้าเรียนวันนี้"/g) ?? []).length).toBe(1);
    expect((source.match(/title="งานที่ต้องติดตาม"/g) ?? []).length).toBe(1);
    expect((source.match(/<DashboardStatGrid\b/g) ?? []).length).toBe(1);
  });

  it("renders understandable empty chart states without relying on color", () => {
    const donut = renderToStaticMarkup(<AttendanceDonutChart totals={{ present: 0, late: 0, absent: 0, leave: 0, unrecorded: 0 }} eligibleCount={0} attendancePercentage={0} />);
    const trend = renderToStaticMarkup(<AttendanceTrendChart points={[{ date: "2026-07-16", attendedCount: 0, eligibleCount: 0, percentage: null, hasSessions: false }]} />);
    const comparison = renderToStaticMarkup(<ClassroomComparisonChart classrooms={[]} />);
    const sessions = renderToStaticMarkup(<SessionStatusChart totals={{ scheduled: 0, live: 0, completed: 0, cancelled: 0, missed: 0, attendanceIncomplete: 0 }} />);
    expect(donut).toContain("ยังไม่มีข้อมูลการเช็กชื่อวันนี้");
    expect(trend).toContain("ไม่ถูกนับเป็นการเข้าเรียน 0%");
    expect(comparison).toContain("ยังไม่มีข้อมูลห้องเรียน");
    expect(sessions).toContain("วันนี้ยังไม่มีคาบเรียน");
  });

  it("renders a stable SVG attendance donut with all attendance statuses", () => {
    const donut = renderToStaticMarkup(<AttendanceDonutChart totals={{ present: 24, late: 2, absent: 1, leave: 1, unrecorded: 2 }} eligibleCount={30} attendancePercentage={80} />);
    expect(donut).toContain("<svg");
    expect(donut).toContain('pathLength="100"');
    expect(donut).toContain("มาเรียน");
    expect(donut).toContain("ยังไม่เช็กชื่อ");
    expect(donut).toContain("80%");
  });

  it("maps attendance quick action to the real completion state", () => {
    expect(getAttendanceActionState(attendanceClass(0, 30))).toMatchObject({ title: "เช็กชื่อ", caption: "บันทึกการเข้าเรียน", state: "idle" });
    expect(getAttendanceActionState(attendanceClass(12, 30))).toMatchObject({ title: "เช็กชื่อต่อ", caption: "เช็กแล้ว 12/30 คน", state: "partial" });
    expect(getAttendanceActionState(attendanceClass(30, 30))).toMatchObject({ title: "เช็กชื่อแล้ว", caption: "ครบ 30/30 คน", state: "complete", href: "/sessions/session-1" });
    expect(getAttendanceActionState(null)).toMatchObject({ title: "เช็กชื่อ", caption: "ดูรายการคาบเรียน", state: "empty", href: "/timetable" });
  });

  it("renders quick actions as one compact four-item row", () => {
    const actions = renderToStaticMarkup(<QuickActions attendanceClass={attendanceClass(0, 30)} />);
    expect(actions).toContain("grid-cols-4");
    expect((actions.match(/<a /g) ?? []).length).toBe(4);
    expect(actions).not.toContain("ดูคาบเรียนทั้งหมด");
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
