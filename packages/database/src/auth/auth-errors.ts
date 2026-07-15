import type { AuthErrorCode } from "@classroom-os/types";

export class AuthError extends Error {
  constructor(
    readonly code: AuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export function authError(code: AuthErrorCode, message: string): AuthError {
  return new AuthError(code, message);
}
