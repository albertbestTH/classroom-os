import { createHash } from "node:crypto";

import { authError } from "@classroom-os/database";

const buckets = new Map<string, { count: number; startedAt: number }>();
const WINDOW_MS = 15 * 60 * 1_000;
const MAX_ATTEMPTS = 5;

export function enforcePublicMutationRateLimit(ipAddress: string, scope: string): void {
  const now = Date.now();
  const key = createHash("sha256").update(`${scope}\0${ipAddress}`).digest("hex");
  const existing = buckets.get(key);
  const bucket = !existing || now - existing.startedAt >= WINDOW_MS ? { count: 0, startedAt: now } : existing;
  bucket.count += 1; buckets.set(key, bucket);
  if (buckets.size > 10_000) {
    const oldest = [...buckets].sort((a, b) => a[1].startedAt - b[1].startedAt)[0]?.[0];
    if (oldest) buckets.delete(oldest);
  }
  if (bucket.count > MAX_ATTEMPTS) throw authError("RATE_LIMITED", "Too many requests. Try again later.");
}
