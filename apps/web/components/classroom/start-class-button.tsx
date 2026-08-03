"use client";

import type { ClassSessionResult, TodayClassResult } from "@classroom-os/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { requestApi, thaiApiError } from "@/lib/client-api";
import { sessionStartWindow } from "@/lib/session-time-policy";

export function StartClassButton({
  item,
  localDate,
  compact = false,
  inverse = false,
}: {
  item: TodayClassResult;
  localDate: string;
  compact?: boolean;
  inverse?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const startWindow = sessionStartWindow(item.scheduledStart, item.scheduledEnd, now);
  const canStart = item.session?.status === "live" || startWindow === "available";
  const startTime = new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  }).format(new Date(item.scheduledStart));

  async function startOrResume() {
    if (item.session?.status === "live") {
      router.push(`/sessions/${item.session.id}`);
      return;
    }
    if (!canStart) return;
    setPending(true);
    setError(null);
    try {
      const session = item.session ?? await requestApi<ClassSessionResult>(
        `/api/timetable/${item.timetableEntry.id}/materialize`,
        { body: { localDate } },
      );
      const live = await requestApi<ClassSessionResult>(`/api/sessions/${session.id}/start`, {
        body: { expectedUpdatedAt: session.updatedAt },
      });
      if (live.status !== "live") throw new Error("Session start was not confirmed by the server.");
      router.push(`/sessions/${live.id}`);
      router.refresh();
    } catch (startError) {
      setError(thaiApiError(startError));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={compact ? "" : "w-full"}>
      <button
        type="button"
        onClick={startOrResume}
        disabled={pending || !canStart || item.status === "completed" || item.status === "missed"}
        className={`${compact ? "min-h-11 px-4 py-2 text-sm" : "min-h-14 w-full px-6 py-3 text-base"} rounded-xl ${inverse ? "bg-white text-[#123D9A] hover:bg-blue-50 focus-visible:ring-white" : "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600"} font-bold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300`}
      >
        {pending
          ? "กำลังเริ่มคาบ…"
          : item.session?.status === "live"
            ? "กลับเข้าสู่คาบเรียน"
            : startWindow === "too-early"
              ? `เริ่มได้เวลา ${startTime} น.`
              : startWindow === "expired"
                ? "เลยเวลาเริ่มคาบแล้ว"
                : startWindow === "loading"
                  ? "กำลังตรวจสอบเวลา…"
                  : "เริ่มคาบเรียน"}
      </button>
      {error ? <p className="mt-2 text-sm text-red-700" role="alert">{error}</p> : null}
    </div>
  );
}
