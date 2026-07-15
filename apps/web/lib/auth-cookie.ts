export const AUTH_COOKIE_NAME = "classroom_os_session";

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
    priority: "high" as const,
  };
}
