import { describe, expect, it } from "vitest";

import { formatElapsedSessionTime, hasReachedScheduledEnd, sessionStartWindow } from "@/lib/session-time-policy";

describe("session action time state", () => {
  const start = "2026-08-03T01:00:00.000Z";
  const end = "2026-08-03T01:50:00.000Z";

  it("keeps start disabled before and after the scheduled window", () => {
    expect(sessionStartWindow(start, end, 0)).toBe("loading");
    expect(sessionStartWindow(start, end, Date.parse(start) - 1)).toBe("too-early");
    expect(sessionStartWindow(start, end, Date.parse(start))).toBe("available");
    expect(sessionStartWindow(start, end, Date.parse(end))).toBe("expired");
  });

  it("enables completion at the scheduled end", () => {
    expect(hasReachedScheduledEnd(end, Date.parse(end) - 1)).toBe(false);
    expect(hasReachedScheduledEnd(end, Date.parse(end))).toBe(true);
  });

  it("advances elapsed time and falls back to the scheduled start", () => {
    expect(formatElapsedSessionTime(start, start, Date.parse(start) + 1_000)).toBe("00:01");
    expect(formatElapsedSessionTime(start, start, Date.parse(start) + 61_000)).toBe("01:01");
    expect(formatElapsedSessionTime(null, start, Date.parse(start) + 90_000)).toBe("01:30");
  });
});
