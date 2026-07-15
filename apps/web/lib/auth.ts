import "server-only";

import {
  AuthError,
  resolveServerSession,
  revokeServerSession,
  type ResolvedSessionResult,
} from "@classroom-os/database";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AUTH_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth-cookie";

export { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";

export async function getOptionalWebSession(): Promise<ResolvedSessionResult | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    return await resolveServerSession(token);
  } catch (error) {
    if (error instanceof AuthError && error.code === "UNAUTHENTICATED") return null;
    throw error;
  }
}

export async function requireWebSession(): Promise<ResolvedSessionResult> {
  const session = await getOptionalWebSession();
  if (!session) redirect("/login");
  return session;
}

export async function setWebSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, sessionCookieOptions(expiresAt));
}

export async function clearWebSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  await revokeServerSession(token);
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export function safeCallbackPath(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value === "/login" || value.startsWith("/login?") ? "/" : value;
}
