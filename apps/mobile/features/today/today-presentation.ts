import type { TodayClassResult, TodayClassStatus } from "@classroom-os/types";

export type DayPeriod = "morning" | "afternoon";

export function dayPeriodFor(isoDate: string): DayPeriod {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Bangkok" }).format(new Date(isoDate)));
  return hour < 12 ? "morning" : "afternoon";
}

export function groupTodayClasses(classes: TodayClassResult[]): Record<DayPeriod, TodayClassResult[]> {
  return classes.reduce<Record<DayPeriod, TodayClassResult[]>>((groups, item) => {
    groups[dayPeriodFor(item.scheduledStart)].push(item);
    return groups;
  }, { morning: [], afternoon: [] });
}

export function timelineStatus(status: TodayClassStatus): "complete" | "current" | "upcoming" | "cancelled" {
  if (status === "completed") return "complete";
  if (status === "live") return "current";
  if (status === "cancelled" || status === "missed") return "cancelled";
  return "upcoming";
}
