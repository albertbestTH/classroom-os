import { describe, expect, it } from "vitest";

import {
  requireSessionStartTime,
} from "../src/services/session-time-policy.js";

const session = {
  scheduledStart: new Date("2026-08-03T01:00:00.000Z"),
  scheduledEnd: new Date("2026-08-03T01:50:00.000Z"),
};

describe("class session time policy", () => {
  it("allows one start only within the scheduled window", () => {
    expect(() => requireSessionStartTime(session, new Date("2026-08-03T00:59:59.999Z"))).toThrowError(expect.objectContaining({ code: "INVALID_STATE_TRANSITION" }));
    expect(() => requireSessionStartTime(session, session.scheduledStart)).not.toThrow();
    expect(() => requireSessionStartTime(session, new Date("2026-08-03T01:49:59.999Z"))).not.toThrow();
    expect(() => requireSessionStartTime(session, session.scheduledEnd)).toThrowError(expect.objectContaining({ code: "INVALID_STATE_TRANSITION" }));
  });

});
