import { Algorithm, hash, verify } from "@node-rs/argon2";

import { authError } from "./auth-errors.js";

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

const COMMON_PASSWORD_FRAGMENTS = [
  "password",
  "qwerty",
  "letmein",
  "welcome",
  "admin",
  "123456",
] as const;

const ARGON2_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

export function assertStrongPassword(password: string): void {
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    throw authError(
      "INVALID_CREDENTIALS",
      `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`,
    );
  }

  const normalized = password.toLowerCase();
  const hasRequiredCharacterClasses =
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password);

  if (
    !hasRequiredCharacterClasses ||
    COMMON_PASSWORD_FRAGMENTS.some((fragment) => normalized.includes(fragment))
  ) {
    throw authError(
      "INVALID_CREDENTIALS",
      "Password must include upper- and lowercase letters, a number, and a symbol, and must not be commonly used.",
    );
  }
}

export async function hashPassword(password: string): Promise<string> {
  assertStrongPassword(password);
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}
