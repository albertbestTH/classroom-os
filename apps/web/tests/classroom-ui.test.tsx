import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import SessionError from "@/app/sessions/[id]/error";
import SessionLoading from "@/app/sessions/[id]/loading";
import TimetableError from "@/app/timetable/error";
import TimetableLoading from "@/app/timetable/loading";
import { TodaySchedule } from "@/components/classroom/today-schedule";

describe("operational classroom states", () => {
  it("renders Thai loading and keyboard-accessible retry states", () => {
    expect(renderToStaticMarkup(<TimetableLoading />)).toContain("กำลังโหลดตารางสอน");
    expect(renderToStaticMarkup(<SessionLoading />)).toContain("กำลังโหลดคาบเรียน");
    const timetableError = renderToStaticMarkup(<TimetableError error={new Error("synthetic")} reset={() => undefined} />);
    const sessionError = renderToStaticMarkup(<SessionError error={new Error("synthetic")} reset={() => undefined} />);
    expect(timetableError).toContain('type="button"');
    expect(sessionError).toContain("ลองใหม่");
  });

  it("renders the real-data empty schedule state", () => {
    const markup = renderToStaticMarkup(<TodaySchedule today={{
      localDate: "2026-07-15",
      timezone: "Asia/Bangkok",
      currentAcademicYear: null,
      currentTerm: null,
      classes: [],
      nextClass: null,
      completedCount: 0,
      missedCount: 0,
    }} />);
    expect(markup).toContain("วันนี้ไม่มีคาบเรียน");
    expect(markup).not.toContain("mock");
  });
});
