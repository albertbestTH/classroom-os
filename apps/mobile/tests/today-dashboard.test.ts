const { readFileSync } = jest.requireActual("node:fs") as { readFileSync(path: string, encoding: string): string };
const { resolve } = jest.requireActual("node:path") as { resolve(...paths: string[]): string };

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("mobile Today dashboard composition", () => {
  const screen = source("features/today/today-screen.tsx");
  const dashboard = source("features/today/today-dashboard.tsx");

  it("renders the dedicated dashboard from the real Today route", () => {
    expect(screen).toContain("<TodayDashboard");
    expect(screen).toContain('useAuthenticatedQuery<DashboardOverviewResult>');
    expect(screen).toContain('"/api/dashboard/overview"');
  });

  it("keeps the approved mobile section hierarchy", () => {
    const hero = dashboard.indexOf("<NextClassHero");
    const quickActions = dashboard.indexOf("<QuickActions");
    const attendance = dashboard.indexOf("<AttendanceDonut");
    const schedule = dashboard.indexOf("<TodaySchedule");
    const pending = dashboard.indexOf("<PendingWork");
    expect(hero).toBeGreaterThan(-1);
    expect(quickActions).toBeGreaterThan(hero);
    expect(attendance).toBeGreaterThan(quickActions);
    expect(schedule).toBeGreaterThan(attendance);
    expect(pending).toBeGreaterThan(schedule);
  });

  it("uses real routes and server attendance totals without mock metrics", () => {
    const picker = source("features/today/attendance-scope-picker.tsx");
    expect(dashboard).toContain("overview.attendance.totals");
    expect(dashboard).toContain("overview.filterOptions.classrooms");
    expect(dashboard).toContain("<AttendanceScopePicker");
    expect(picker).toContain('accessibilityLabel="เลือกห้องเรียนสำหรับภาพรวมการเข้าเรียน"');
    expect(picker).toContain('label: "ทุกห้องเรียน"');
    expect(dashboard).toContain('/(tabs)/classes');
    expect(dashboard).toContain('/(tabs)/scores');
    expect(dashboard).toContain('/(tabs)/profile');
    expect(dashboard).not.toContain("mockData");
  });

  it("does not retry session start and refreshes the dashboard in the background", () => {
    expect(screen).toContain("retry: false");
    expect(screen).toContain("void invalidateSessionWorkflow");
    expect(source("lib/query-keys.ts")).toContain('queryKey: ["dashboard"]');
  });

  it("defaults to the same all-classroom attendance scope as Web and keys filtered requests by classroom", () => {
    expect(screen).toContain('const [dashboardClassroomId, setDashboardClassroomId]');
    expect(screen).toContain('const dashboardPath = dashboardClassroomId');
    expect(screen).toContain('`/api/dashboard/overview?classroomId=${encodeURIComponent(dashboardClassroomId)}`');
    expect(screen).toContain('queryKeys.dashboard(dashboardClassroomId)');
    expect(screen).not.toContain("focusClassroomId");
  });
});
