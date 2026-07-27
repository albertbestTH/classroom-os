"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { OPERATIONAL_REFRESH_INTERVAL } from "@/lib/operational-freshness-policy";

export function OperationalFreshness({ poll }: { poll: boolean }) {
  const router = useRouter();
  const lastRefresh = useRef(0);
  useEffect(() => {
    const refresh = () => {
      const now = Date.now();
      if (now - lastRefresh.current < 750) return;
      lastRefresh.current = now;
      router.refresh();
    };
    const refreshVisible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshVisible);
    const timer = poll ? window.setInterval(refresh, OPERATIONAL_REFRESH_INTERVAL) : null;
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshVisible);
      if (timer !== null) window.clearInterval(timer);
    };
  }, [poll, router]);
  return null;
}
