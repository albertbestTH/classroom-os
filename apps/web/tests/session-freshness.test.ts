import { describe, expect, it } from "vitest";

import { sessionRefreshInterval } from "@/components/classroom/session-freshness";
import { OPERATIONAL_REFRESH_INTERVAL, sessionNeedsPolling, todayNeedsPolling } from "@/lib/operational-freshness-policy";

describe("live session freshness", () => {
  it("polls lightly only while the session is live", () => {
    expect(sessionRefreshInterval("live")).toBe(OPERATIONAL_REFRESH_INTERVAL);
    expect(sessionRefreshInterval("completed")).toBe(false);
    expect(sessionRefreshInterval("cancelled")).toBe(false);
    expect(sessionRefreshInterval("scheduled")).toBe(false);
  });

  it("polls live and near-current scheduled work but stops for completed history", () => {
    const now = Date.parse("2026-07-23T03:00:00Z");
    expect(sessionNeedsPolling("scheduled", "2026-07-23T03:10:00Z", "2026-07-23T04:00:00Z", now)).toBe(true);
    expect(sessionNeedsPolling("scheduled", "2026-07-23T05:00:00Z", "2026-07-23T06:00:00Z", now)).toBe(false);
    expect(sessionNeedsPolling("completed", "2026-07-23T03:00:00Z", "2026-07-23T04:00:00Z", now)).toBe(false);
    expect(todayNeedsPolling({ classes: [{ status: "live" }] } as never, now)).toBe(true);
    expect(todayNeedsPolling({ classes: [{ status: "completed" }] } as never, now)).toBe(false);
  });
});
