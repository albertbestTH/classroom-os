const { readFileSync } = jest.requireActual("node:fs") as { readFileSync(path: string, encoding: string): string };
const { resolve } = jest.requireActual("node:path") as { resolve(...paths: string[]): string };

function source(path: string): string { return readFileSync(resolve(process.cwd(), path), "utf8"); }

describe("teacher navigation and refresh regressions", () => {
  it("keeps pull-to-refresh on Today and Classes", () => {
    expect(source("features/today/today-screen.tsx")).toContain("RefreshControl");
    expect(source("features/classes/classes-screen.tsx")).toContain("RefreshControl");
  });

  it("keeps explicit exits from attendance and class details without duplicating persistent tabs on session summary", () => {
    expect(source("features/attendance/attendance-screen.tsx")).toContain("กลับไปหน้าห้องเรียน");
    expect(source("app/classes/[id].tsx")).toContain("กลับไปตารางสอน");
    expect(source("app/sessions/[id]/summary.tsx")).not.toContain('label="กลับไปหน้าวันนี้"');
    expect(source("app/sessions/[id]/summary.tsx")).not.toContain('label="ไปตารางสอน"');
  });

  it("preserves the selected timetable day when returning from class details", () => {
    const classes = source("features/classes/classes-screen.tsx");
    const detail = source("app/classes/[id].tsx");

    expect(classes).toContain("returnWeekday=${activeWeekday}&returnView=${view}");
    expect(classes).toContain('useLocalSearchParams<{ weekday?: string; view?: string }>()');
    expect(detail).toContain("timetableReturnPath");
    expect(detail).toContain("weekday=${weekdayNumber}&view=");
    expect(detail).toContain("router.replace(timetableReturnPath as never)");
  });

  it("keeps offline mutations disabled in attendance and live session", () => {
    expect(source("features/attendance/attendance-screen.tsx")).toContain("!isOnline || save.isPending");
    expect(source("features/sessions/session-screen.tsx")).toContain("disabled={!isOnline || end.isPending}");
  });
});
