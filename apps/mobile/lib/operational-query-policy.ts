import type { QueryKey } from "@tanstack/react-query";

export const OPERATIONAL_STALE_TIME = 10_000;
export const STABLE_STALE_TIME = 5 * 60_000;
export const OPERATIONAL_GC_TIME = 12 * 60 * 60_000;

export const operationalQueryRoots = new Set([
  "today", "dashboard", "timetable", "assignments", "session", "attendance", "timeline", "gradebook", "timetable-coverages",
]);

export function isOperationalQueryKey(queryKey: QueryKey): boolean {
  return operationalQueryRoots.has(String(queryKey[0]));
}

export function queryPolicyForKey(queryKey: QueryKey) {
  const operational = isOperationalQueryKey(queryKey);
  return {
    staleTime: operational ? OPERATIONAL_STALE_TIME : STABLE_STALE_TIME,
    gcTime: operational ? OPERATIONAL_GC_TIME : undefined,
    refetchOnMount: operational ? "always" as const : true,
    refetchOnReconnect: operational ? "always" as const : true,
    refetchOnWindowFocus: operational ? "always" as const : true,
    retry: 1,
  };
}

export function createAppFocusHandler(notify: (focused: boolean) => void, now = () => Date.now()) {
  let lastState: string | null = null;
  let lastActiveAt = 0;
  return (state: string) => {
    const active = state === "active";
    if (state === lastState) return;
    lastState = state;
    if (!active) { notify(false); return; }
    const current = now();
    if (current - lastActiveAt < 750) return;
    lastActiveAt = current;
    notify(true);
  };
}
