import { describe, expect, it } from "vitest";

import { navigationForRole } from "@/lib/navigation";

describe("role-based navigation", () => {
  it("shows owner-only settings and all manager sections to school owners", () => {
    const items = navigationForRole("SCHOOL_OWNER");
    expect(items.map(({ href }) => href)).toEqual(["/", "/students", "/staff", "/classrooms", "/subjects", "/academic-years", "/terms", "/timetable", "/attendance", "/gradebook", "/reports", "/import", "/documents", "/settings"]);
  });

  it("shows general school settings for admins", () => {
    const hrefs = navigationForRole("ADMIN").map(({ href }) => href);
    expect(hrefs).toEqual(["/", "/students", "/staff", "/classrooms", "/subjects", "/academic-years", "/terms", "/timetable", "/attendance", "/gradebook", "/reports", "/import", "/documents", "/settings"]);
  });

  it("shows only teacher work routes to teachers", () => {
    const hrefs = navigationForRole("TEACHER").map(({ href }) => href);
    expect(hrefs).toEqual(["/", "/classrooms", "/timetable", "/live", "/attendance", "/gradebook", "/reports", "/documents", "/profile"]);
    expect(hrefs).not.toEqual(expect.arrayContaining(["/staff", "/subjects", "/academic-years", "/terms", "/import", "/settings"]));
  });

  it("gives personal owners teacher work plus self-setup without staff administration", () => {
    const hrefs = navigationForRole("SCHOOL_OWNER", "PERSONAL").map(({ href }) => href);
    expect(hrefs).toEqual(expect.arrayContaining(["/students", "/classrooms", "/subjects", "/personal-setup", "/timetable", "/live", "/profile"]));
    expect(hrefs).not.toEqual(expect.arrayContaining(["/staff", "/import"]));
  });
});
