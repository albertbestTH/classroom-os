import { canRestoreCachedMobileSession, isStoredMobileSessionExpired } from "@/features/auth/session-policy";
import { MobileApiError } from "@/lib/api-error";

describe("persistent mobile session policy", () => {
  const session = {
    token: "synthetic-token",
    expiresAt: "2031-01-01T00:00:00.000Z",
  };

  it("keeps a valid stored session across app restarts", () => {
    expect(isStoredMobileSessionExpired(session, Date.parse("2030-01-01T00:00:00.000Z"))).toBe(false);
  });

  it("rejects an expired or malformed stored session", () => {
    expect(isStoredMobileSessionExpired(session, Date.parse("2031-02-01T00:00:00.000Z"))).toBe(true);
    expect(isStoredMobileSessionExpired({ ...session, expiresAt: "invalid" })).toBe(true);
  });

  it.each([
    new MobileApiError("offline", "network"),
    new MobileApiError("timeout", "timeout"),
    new MobileApiError("bad response", "unknown", undefined, 200),
    new MobileApiError("unavailable", "api", "INTERNAL_ERROR", 503),
  ])("keeps the cached session for transient validation failure %#", (error) => {
    expect(canRestoreCachedMobileSession(error)).toBe(true);
  });

  it.each([
    new MobileApiError("expired", "api", "UNAUTHENTICATED", 401),
    new MobileApiError("disabled", "api", "ACCOUNT_DISABLED", 403),
    new Error("unsupported mobile role"),
  ])("does not retain a definitively invalid session %#", (error) => {
    expect(canRestoreCachedMobileSession(error)).toBe(false);
  });
});
