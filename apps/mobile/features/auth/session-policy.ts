import { MobileApiError } from "@/lib/api-error";
import type { StoredMobileSession } from "@/lib/auth-storage";

export function isStoredMobileSessionExpired(
  session: StoredMobileSession,
  now = Date.now(),
): boolean {
  const expiresAt = Date.parse(session.expiresAt);
  return !Number.isFinite(expiresAt) || expiresAt <= now;
}

export function canRestoreCachedMobileSession(error: unknown): boolean {
  if (!(error instanceof MobileApiError)) return false;
  return error.kind === "network" ||
    error.kind === "timeout" ||
    error.kind === "unknown" ||
    (typeof error.status === "number" && error.status >= 500);
}
