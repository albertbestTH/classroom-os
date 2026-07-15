"use client";

import type { TeacherProfileResult } from "@classroom-os/types";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { requestApi, thaiApiError } from "@/lib/client-api";

export function TeacherProfileForm({ userId }: { userId: string }) {
  const router = useRouter();
  const employeeCodeId = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true); setError(null);
    try {
      await requestApi<TeacherProfileResult>(`/api/staff/${userId}/teacher-profile`, {
        method: "PUT", body: { employeeCode: data.get("employeeCode") },
      });
      router.refresh();
    } catch (submitError) { setError(thaiApiError(submitError)); }
    finally { setPending(false); }
  }
  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1"><label htmlFor={employeeCodeId} className="mb-2 block text-sm font-semibold">รหัสบุคลากร</label><input id={employeeCodeId} name="employeeCode" required className="min-h-11 w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20" /></div>
      <button type="submit" disabled={pending} className="min-h-11 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-60">{pending ? "กำลังบันทึก…" : "สร้างโปรไฟล์ครู"}</button>
      {error ? <p className="text-sm text-red-700 sm:basis-full" role="alert">{error}</p> : null}
    </form>
  );
}
