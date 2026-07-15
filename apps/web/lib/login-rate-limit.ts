import { createHash } from "node:crypto";

import {
  authenticateWithPassword,
  authError,
  normalizeEmail,
  type PasswordLoginInput,
  type ServerSessionResult,
} from "@classroom-os/database";

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_WINDOW_MS = 15 * 60 * 1_000;
const DEFAULT_MAX_BUCKETS = 10_000;

type AttemptBucket = { count: number; windowStartedAt: number };

export type LoginRateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function rateLimitKey(email: string, ipAddress: string): string {
  return createHash("sha256")
    .update(`${normalizeEmail(email)}\0${ipAddress.trim() || "unknown"}`)
    .digest("hex");
}

export class LoginRateLimiter {
  private readonly attempts = new Map<string, AttemptBucket>();

  constructor(
    readonly maxAttempts = DEFAULT_MAX_ATTEMPTS,
    readonly windowMs = DEFAULT_WINDOW_MS,
    readonly maxBuckets = DEFAULT_MAX_BUCKETS,
  ) {}

  consume(email: string, ipAddress: string, now = Date.now()): LoginRateLimitDecision {
    const key = rateLimitKey(email, ipAddress);
    const current = this.attempts.get(key);
    if (!current && this.attempts.size >= this.maxBuckets) {
      let oldestKey: string | undefined;
      let oldestTime = Number.POSITIVE_INFINITY;
      for (const [candidateKey, candidate] of this.attempts) {
        if (candidate.windowStartedAt < oldestTime) {
          oldestKey = candidateKey;
          oldestTime = candidate.windowStartedAt;
        }
      }
      if (oldestKey) this.attempts.delete(oldestKey);
    }
    const bucket = !current || now - current.windowStartedAt >= this.windowMs
      ? { count: 0, windowStartedAt: now }
      : current;
    bucket.count += 1;
    this.attempts.set(key, bucket);

    const allowed = bucket.count <= this.maxAttempts;
    return {
      allowed,
      remaining: Math.max(this.maxAttempts - bucket.count, 0),
      retryAfterSeconds: allowed
        ? 0
        : Math.max(Math.ceil((bucket.windowStartedAt + this.windowMs - now) / 1_000), 1),
    };
  }

  reset(email: string, ipAddress: string): void {
    this.attempts.delete(rateLimitKey(email, ipAddress));
  }

  clear(): void {
    this.attempts.clear();
  }
}

let processRateLimiter: LoginRateLimiter | undefined;

export function getLoginRateLimiter(): LoginRateLimiter {
  processRateLimiter ??= new LoginRateLimiter(
    positiveInteger(process.env.AUTH_LOGIN_RATE_LIMIT_MAX, DEFAULT_MAX_ATTEMPTS),
    positiveInteger(process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS),
    positiveInteger(process.env.AUTH_LOGIN_RATE_LIMIT_MAX_BUCKETS, DEFAULT_MAX_BUCKETS),
  );
  return processRateLimiter;
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

export async function loginWithRateLimit(
  input: PasswordLoginInput,
  ipAddress: string,
): Promise<ServerSessionResult> {
  const limiter = getLoginRateLimiter();
  const decision = limiter.consume(input.email, ipAddress);
  if (!decision.allowed) {
    throw authError("RATE_LIMITED", "Too many login attempts. Try again later.");
  }

  const session = await authenticateWithPassword(input);
  limiter.reset(input.email, ipAddress);
  return session;
}
