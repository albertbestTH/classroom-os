import type { CurrentUserResult, MobileSessionResult, MobileSessionValidationResult } from "@classroom-os/types";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api-client";
import { deleteMobileSession, readMobileSession, saveMobileSession } from "@/lib/auth-storage";
import { clearPersistedQueries } from "@/lib/query-persistence";

import { canRestoreCachedMobileSession, isStoredMobileSessionExpired } from "./session-policy";

type AuthState = "loading" | "authenticated" | "unauthenticated";
type AuthContextValue = {
  state: AuthState;
  user: CurrentUserResult | null;
  token: string | null;
  message: string | null;
  login(email: string, password: string): Promise<void>;
  updateUser(user: CurrentUserResult): void;
  logout(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function canUseTeacherMobile(user: CurrentUserResult): boolean {
  return user.role === "TEACHER" || (user.workspaceType === "PERSONAL" && user.role === "SCHOOL_OWNER" && Boolean(user.teacherId));
}

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>("loading");
  const [user, setUser] = useState<CurrentUserResult | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const stored = await readMobileSession();
      if (!stored || isStoredMobileSessionExpired(stored)) {
        await deleteMobileSession(); await clearPersistedQueries(); queryClient.clear();
        if (active) { setMessage(stored ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง" : null); setState("unauthenticated"); }
        return;
      }
      try {
        const refreshed = await apiRequest<MobileSessionValidationResult>("/api/mobile/auth/session", { token: stored.token });
        if (!canUseTeacherMobile(refreshed.user)) throw new Error("Unsupported mobile role");
        await saveMobileSession({ token: stored.token, expiresAt: refreshed.expiresAt, user: refreshed.user });
        if (active) { setToken(stored.token); setUser(refreshed.user); setState("authenticated"); }
      } catch (error) {
        if (stored.user && canRestoreCachedMobileSession(error)) {
          if (active) { setToken(stored.token); setUser(stored.user); setMessage("กำลังใช้งานข้อมูลที่บันทึกไว้ จะตรวจสอบเซสชันอีกครั้งเมื่อเชื่อมต่อได้"); setState("authenticated"); }
          return;
        }
        await deleteMobileSession(); await clearPersistedQueries(); queryClient.clear();
        if (active) { setMessage("เซสชันไม่พร้อมใช้งาน กรุณาเข้าสู่ระบบอีกครั้ง"); setState("unauthenticated"); }
      }
    })();
    return () => { active = false; };
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(() => ({
    state, user, token, message,
    updateUser(nextUser) { setUser(nextUser); },
    async login(email, password) {
      await clearPersistedQueries(); queryClient.clear();
      const session = await apiRequest<MobileSessionResult>("/api/mobile/auth/login", { method: "POST", body: { email, password }, retryReads: 0 });
      if (!canUseTeacherMobile(session.user)) throw new Error("Unsupported mobile role");
      await saveMobileSession({ token: session.token, expiresAt: session.expiresAt, user: session.user });
      setToken(session.token); setUser(session.user); setMessage(null); setState("authenticated");
    },
    async logout() {
      try { if (token) await apiRequest("/api/mobile/auth/logout", { method: "POST", token }); } finally {
        await deleteMobileSession(); await clearPersistedQueries(); queryClient.clear(); setToken(null); setUser(null); setMessage(null); setState("unauthenticated");
      }
    },
  }), [message, queryClient, state, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
