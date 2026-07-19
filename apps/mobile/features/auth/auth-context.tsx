import type { CurrentUserResult, MobileSessionResult } from "@classroom-os/types";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api-client";
import { deleteMobileSession, readMobileSession, saveMobileSession } from "@/lib/auth-storage";
import { clearPersistedQueries } from "@/lib/query-persistence";

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
      if (!stored || new Date(stored.expiresAt) <= new Date()) {
        await deleteMobileSession(); await clearPersistedQueries(); queryClient.clear();
        if (active) { setMessage(stored ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง" : null); setState("unauthenticated"); }
        return;
      }
      try {
        const current = await apiRequest<CurrentUserResult>("/api/mobile/auth/session", { token: stored.token });
        if (current.role !== "TEACHER") throw new Error("Unsupported mobile role");
        if (active) { setToken(stored.token); setUser(current); setState("authenticated"); }
      } catch {
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
      if (session.user.role !== "TEACHER") throw new Error("Unsupported mobile role");
      await saveMobileSession({ token: session.token, expiresAt: session.expiresAt });
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
