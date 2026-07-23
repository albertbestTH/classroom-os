import type { TodayClassResult } from "@classroom-os/types";

import { dayPeriodFor, groupTodayClasses, timelineStatus } from "@/features/today/today-presentation";

function item(scheduledStart: string, status: TodayClassResult["status"]): TodayClassResult {
  return { scheduledStart, scheduledEnd: scheduledStart, status, session: null, coverage: null, timetableEntry: { id: scheduledStart } } as TodayClassResult;
}

describe("Today presentation", () => {
  it("groups Bangkok schedule times into morning and afternoon", () => {
    expect(dayPeriodFor("2026-07-23T02:00:00.000Z")).toBe("morning");
    expect(dayPeriodFor("2026-07-23T07:00:00.000Z")).toBe("afternoon");
    const groups = groupTodayClasses([item("2026-07-23T02:00:00.000Z", "scheduled"), item("2026-07-23T07:00:00.000Z", "completed")]);
    expect(groups.morning).toHaveLength(1);
    expect(groups.afternoon).toHaveLength(1);
  });

  it("maps session states to accessible timeline states", () => {
    expect(timelineStatus("live")).toBe("current");
    expect(timelineStatus("completed")).toBe("complete");
    expect(timelineStatus("cancelled")).toBe("cancelled");
    expect(timelineStatus("scheduled")).toBe("upcoming");
  });
});
