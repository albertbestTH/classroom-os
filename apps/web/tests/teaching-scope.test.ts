import { describe, expect, it } from "vitest";

import { effectiveTeachingContext, isTeacherWorkspace } from "@/lib/teaching-scope";

const ownerContext = {
  userId: "user-1",
  schoolId: "school-1",
  role: "SCHOOL_OWNER" as const,
  teacherId: "teacher-1",
};

describe("personal teaching scope", () => {
  it("treats a personal owner as a teacher without changing tenant identity", () => {
    const effective = effectiveTeachingContext(ownerContext, { workspaceType: "PERSONAL" });
    expect(effective).toEqual({ ...ownerContext, role: "TEACHER" });
    expect(isTeacherWorkspace(ownerContext, { workspaceType: "PERSONAL" })).toBe(true);
  });

  it("preserves school owner scope for an institutional workspace", () => {
    expect(effectiveTeachingContext(ownerContext, { workspaceType: "SCHOOL" })).toBe(ownerContext);
    expect(isTeacherWorkspace(ownerContext, { workspaceType: "SCHOOL" })).toBe(false);
  });
});
