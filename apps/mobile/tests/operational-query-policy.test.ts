import { createAppFocusHandler, OPERATIONAL_STALE_TIME, queryPolicyForKey, STABLE_STALE_TIME } from "@/lib/operational-query-policy";

describe("operational query freshness", () => {
  it("uses short freshness only for operational roots", () => {
    expect(queryPolicyForKey(["today"]).staleTime).toBe(OPERATIONAL_STALE_TIME);
    expect(queryPolicyForKey(["dashboard", "classroom-id"]).staleTime).toBe(OPERATIONAL_STALE_TIME);
    expect(queryPolicyForKey(["session", "id"]).refetchOnReconnect).toBe("always");
    expect(queryPolicyForKey(["profile"]).staleTime).toBe(STABLE_STALE_TIME);
  });

  it("deduplicates repeated AppState active events", () => {
    const notifications: boolean[] = [];
    let now = 1_000;
    const handle = createAppFocusHandler((focused) => notifications.push(focused), () => now);
    handle("background"); handle("active"); handle("active");
    now += 1_000; handle("background"); handle("active");
    expect(notifications).toEqual([false, true, false, true]);
  });
});
