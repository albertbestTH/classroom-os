import { describe, expect, it } from "vitest";

import {
  assertStrongPassword,
  hashPassword,
  verifyPassword,
} from "../../src/index.js";

describe("password security", () => {
  it("hashes with Argon2id and verifies without retaining plaintext", async () => {
    const password = "Synthetic!Secure2026";
    const passwordHash = await hashPassword(password);

    expect(passwordHash).toMatch(/^\$argon2id\$/);
    expect(passwordHash).not.toContain(password);
    await expect(verifyPassword(passwordHash, password)).resolves.toBe(true);
    await expect(verifyPassword(passwordHash, "Incorrect!Value9")).resolves.toBe(false);
  });

  it.each(["short", "Password123!", "alllowercase123!"])(
    "rejects an obviously weak password",
    (password) => {
      expect(() => assertStrongPassword(password)).toThrowError(
        expect.objectContaining({ code: "INVALID_CREDENTIALS" }),
      );
    },
  );

  it("treats malformed stored hashes as a failed verification", async () => {
    await expect(verifyPassword("not-a-password-hash", "Synthetic!Secure2026")).resolves.toBe(false);
  });
});
