import { describe, expect, it } from "vitest";

import { LoginRateLimiter } from "@/lib/login-rate-limit";

describe("login rate limiter", () => {
  it("enforces the threshold by normalized email and IP", () => {
    const limiter = new LoginRateLimiter(2, 60_000);
    expect(limiter.consume(" Teacher@Example.invalid ", "127.0.0.1", 1_000).allowed).toBe(true);
    expect(limiter.consume("teacher@example.invalid", "127.0.0.1", 2_000).allowed).toBe(true);
    const blocked = limiter.consume("TEACHER@example.invalid", "127.0.0.1", 3_000);
    expect(blocked).toMatchObject({ allowed: false, remaining: 0 });
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(limiter.consume("teacher@example.invalid", "127.0.0.2", 3_000).allowed).toBe(true);
  });

  it("resets explicitly and after the configured window", () => {
    const limiter = new LoginRateLimiter(1, 1_000);
    expect(limiter.consume("teacher@example.invalid", "127.0.0.1", 0).allowed).toBe(true);
    expect(limiter.consume("teacher@example.invalid", "127.0.0.1", 10).allowed).toBe(false);
    limiter.reset("TEACHER@example.invalid", "127.0.0.1");
    expect(limiter.consume("teacher@example.invalid", "127.0.0.1", 20).allowed).toBe(true);
    expect(limiter.consume("teacher@example.invalid", "127.0.0.1", 1_020).allowed).toBe(true);
  });
});
