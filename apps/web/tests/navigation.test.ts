import { describe, expect, it } from "vitest";

import { navigationForRole } from "@/lib/navigation";

describe("role-based navigation", () => {
  it("shows owner-only settings and all manager sections to school owners", () => {
    const items = navigationForRole("SCHOOL_OWNER");
    expect(items.map(({ href }) => href)).toEqual(["/", "/students", "/staff", "/classrooms", "/subjects", "/academic-years", "/terms", "/timetable", "/attendance", "/gradebook", "/reports", "/import", "/documents", "/settings"]);
  });

  it("omits owner settings for admins", () => {
    const hrefs = navigationForRole("ADMIN").map(({ href }) => href);
    expect(hrefs).toEqual(["/", "/students", "/staff", "/classrooms", "/subjects", "/academic-years", "/terms", "/timetable", "/attendance", "/gradebook", "/reports", "/import", "/documents"]);
  });

  it("shows only teacher work routes to teachers", () => {
    const hrefs = navigationForRole("TEACHER").map(({ href }) => href);
    expect(hrefs).toEqual(["/", "/classrooms", "/timetable", "/live", "/attendance", "/gradebook", "/reports", "/documents", "/profile"]);
    expect(hrefs).not.toEqual(expect.arrayContaining(["/staff", "/subjects", "/academic-years", "/terms", "/import", "/settings"]));
  });
});
