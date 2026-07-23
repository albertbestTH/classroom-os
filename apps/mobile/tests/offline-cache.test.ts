import { shouldPersistQuery } from "@/lib/query-persistence";

describe("offline read cache", () => {
  it.each(["today", "timetable", "assignments", "classrooms", "profile"])("persists successful %s reads", (root) => {
    expect(shouldPersistQuery({ state: { status: "success" }, queryKey: [root] })).toBe(true);
  });
  it("does not persist attendance or failed requests", () => {
    expect(shouldPersistQuery({ state: { status: "success" }, queryKey: ["attendance"] })).toBe(false);
    expect(shouldPersistQuery({ state: { status: "error" }, queryKey: ["today"] })).toBe(false);
  });
});
