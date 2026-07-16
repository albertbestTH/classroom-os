import { describe, expect, it } from "vitest";

import { localDateForInstant, localDateTimeToInstant, schoolDayBounds } from "../../src/index.js";

describe("school timezone conversion", () => {
  it("converts Thai local class times without using the server timezone", () => {
    expect(localDateTimeToInstant("2026-07-20", "08:00", "Asia/Bangkok").toISOString()).toBe("2026-07-20T01:00:00.000Z");
    expect(localDateForInstant(new Date("2026-07-19T18:30:00.000Z"), "Asia/Bangkok")).toBe("2026-07-20");
  });

  it("calculates local day boundaries across daylight-saving changes", () => {
    const bounds = schoolDayBounds("America/New_York", new Date("2026-03-08T16:00:00.000Z"));
    expect(bounds.localDate).toBe("2026-03-08");
    expect(bounds.startsAt.toISOString()).toBe("2026-03-08T05:00:00.000Z");
    expect(bounds.endsAt.toISOString()).toBe("2026-03-09T04:00:00.000Z");
  });
});
