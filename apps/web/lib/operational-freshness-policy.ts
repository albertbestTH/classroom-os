import type { TodayTimetableResult } from "@classroom-os/types";

export const OPERATIONAL_REFRESH_INTERVAL = 10_000;
const NEAR_WINDOW_MS = 30 * 60_000;

export function todayNeedsPolling(today: Pick<TodayTimetableResult, "classes">, now: number): boolean {
  return today.classes.some((item) => item.status === "live" || (
    item.status === "scheduled" && new Date(item.scheduledStart).getTime() <= now + NEAR_WINDOW_MS && new Date(item.scheduledEnd).getTime() >= now
  ));
}

export function sessionNeedsPolling(status: string, scheduledStart: string, scheduledEnd: string, now: number): boolean {
  if (status === "live") return true;
  return status === "scheduled" && new Date(scheduledStart).getTime() <= now + NEAR_WINDOW_MS && new Date(scheduledEnd).getTime() >= now;
}
