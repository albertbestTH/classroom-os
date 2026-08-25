import { activeTeacherTab } from "@/features/navigation/teacher-tab-routes";

const { readFileSync } = jest.requireActual("node:fs") as { readFileSync(path: string, encoding: string): string };
const { resolve } = jest.requireActual("node:path") as { resolve(...paths: string[]): string };

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("persistent teacher tabs", () => {
  it("maps detail routes to the expected primary teacher tab", () => {
    expect(activeTeacherTab("/")).toBe("today");
    expect(activeTeacherTab("/sessions/session-1/attendance")).toBe("today");
    expect(activeTeacherTab("/classes/class-1")).toBe("timetable");
    expect(activeTeacherTab("/gradebook/assignment-1")).toBe("scores");
    expect(activeTeacherTab("/sessions/session-1/scores")).toBe("scores");
    expect(activeTeacherTab("/profile")).toBe("profile");
  });

  it("renders one authenticated root tab bar while hiding the nested native tab bar", () => {
    const root = source("app/_layout.tsx");
    const nestedTabs = source("app/(tabs)/_layout.tsx");
    expect(root).toContain('state === "authenticated"');
    expect(root).toContain("<TeacherBottomTabs />");
    expect(nestedTabs).toContain('tabBarStyle: { display: "none" }');
  });

  it("keeps the four approved destinations and reserves layout space instead of overlaying content", () => {
    const tabs = source("components/navigation/teacher-bottom-tabs.tsx");
    for (const label of ["วันนี้", "ตารางสอน", "คะแนน", "โปรไฟล์"]) expect(tabs).toContain(`label: "${label}"`);
    expect(tabs).not.toContain('position: "absolute"');
  });
});
