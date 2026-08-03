import { canStartScheduledSession, formatElapsed, formatRemaining, hasReachedScheduledEnd } from "@/features/sessions/session-time";

describe("live session timing", () => {
  it("formats elapsed and remaining scheduled time", () => {
    const now = Date.parse("2026-07-23T03:30:30.000Z");
    expect(formatElapsed("2026-07-23T03:00:00.000Z", now)).toBe("30:30");
    expect(formatRemaining("2026-07-23T04:00:00.000Z", now)).toBe("29:30");
  });

  it("never shows negative remaining time", () => {
    expect(formatRemaining("2026-07-23T03:00:00.000Z", Date.parse("2026-07-23T04:00:00.000Z"))).toBe("00:00");
  });

  it("opens actions only inside their scheduled time boundaries", () => {
    const start = "2026-07-23T03:00:00.000Z";
    const end = "2026-07-23T04:00:00.000Z";
    expect(canStartScheduledSession(start, end, Date.parse(start) - 1)).toBe(false);
    expect(canStartScheduledSession(start, end, Date.parse(start))).toBe(true);
    expect(canStartScheduledSession(start, end, Date.parse(end))).toBe(false);
    expect(hasReachedScheduledEnd(end, Date.parse(end) - 1)).toBe(false);
    expect(hasReachedScheduledEnd(end, Date.parse(end))).toBe(true);
  });
});
