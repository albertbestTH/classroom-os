import type { CurrentUserResult } from "@classroom-os/types";
import * as SecureStore from "expo-secure-store";

const SESSION_KEY = "classroom-os.mobile-session";

export type StoredMobileSession = { token: string; expiresAt: string; user?: CurrentUserResult };

export async function saveMobileSession(session: StoredMobileSession): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function readMobileSession(): Promise<StoredMobileSession | null> {
  const stored = await SecureStore.getItemAsync(SESSION_KEY);
  if (!stored) return null;
  try {
    const value = JSON.parse(stored) as Partial<StoredMobileSession>;
    if (typeof value.token !== "string" || typeof value.expiresAt !== "string") return null;
    return { token: value.token, expiresAt: value.expiresAt, user: value.user };
  } catch { return null; }
}

export async function deleteMobileSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
