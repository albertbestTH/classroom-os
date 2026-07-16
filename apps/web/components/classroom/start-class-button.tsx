"use client";

import type { ClassSessionResult, TodayClassResult } from "@classroom-os/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { requestApi, thaiApiError } from "@/lib/client-api";

export function StartClassButton({
  item,
  localDate,
  compact = false,
}: {
  item: TodayClassResult;
  localDate: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startOrResume() {
    if (item.session?.status === "live") {
      router.push(`/sessions/${item.session.id}`);
      return;
    }
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
        disabled={pending || item.status === "completed" || item.status === "missed"}
        className={`${compact ? "min-h-11 px-4 py-2 text-sm" : "min-h-14 w-full px-6 py-3 text-base"} rounded-xl bg-blue-600 font-bold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300`}
      >
        {pending ? "กำลังเริ่มคาบ…" : item.session?.status === "live" ? "กลับเข้าสู่คาบเรียน" : "เริ่มคาบเรียน"}
      </button>
      {error ? <p className="mt-2 text-sm text-red-700" role="alert">{error}</p> : null}
    </div>
  );
}
