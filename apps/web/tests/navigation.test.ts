import { describe, expect, it } from "vitest";

import { navigationForRole } from "@/lib/navigation";

describe("role-based navigation", () => {
  it("shows owner-only settings and all manager sections to school owners", () => {
    const items = navigationForRole("SCHOOL_OWNER");
    expect(items.map(({ href }) => href)).toEqual(["/", "/students", "/staff", "/classrooms", "/subjects", "/timetable", "/live", "/gradebook", "/reports", "/settings"]);
  });

  it("omits owner settings for admins", () => {
    const hrefs = navigationForRole("ADMIN").map(({ href }) => href);
    expect(hrefs).toContain("/staff");
    expect(hrefs).not.toContain("/settings");
  });

  it("shows only teacher work routes to teachers", () => {
    expect(navigationForRole("TEACHER").map(({ href }) => href)).toEqual(["/", "/classrooms", "/timetable", "/live", "/attendance", "/gradebook"]);
  });
});
