"use server";

import { AuthError, authenticateWithPassword } from "@classroom-os/database";
import { redirect } from "next/navigation";

import { safeCallbackPath, setWebSessionCookie } from "@/lib/auth";

export type LoginState = Readonly<{ error: string | null }>;

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const callbackPath = safeCallbackPath(formData.get("callbackUrl"));

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "กรุณากรอกอีเมลและรหัสผ่าน" };
  }

  try {
    const session = await authenticateWithPassword({ email, password });
    await setWebSessionCookie(session.token, session.expiresAt);
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือบัญชีไม่พร้อมใช้งาน" };
    }
    throw error;
  }

  redirect(callbackPath);
}

export async function logoutAction(): Promise<void> {
  const { clearWebSession } = await import("@/lib/auth");
  await clearWebSession();
  redirect("/login");
}
