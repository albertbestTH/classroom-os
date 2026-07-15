"use client";

import type { AccountStatus, StaffUserResult } from "@classroom-os/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { requestApi, thaiApiError } from "@/lib/client-api";

export function StaffAccountActions({
  staff,
  currentUserId,
  canManage,
}: {
  staff: StaffUserResult;
  currentUserId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextStatus: AccountStatus = staff.status === "ACTIVE" ? "DISABLED" : "ACTIVE";

  async function changeStatus() {
    setPending(true);
    setError(null);
    try {
      await requestApi<StaffUserResult>(`/api/staff/${staff.id}/status`, {
        method: "PATCH",
        body: { status: nextStatus },
      });
      setConfirming(false);
      if (staff.id === currentUserId && nextStatus === "DISABLED") {
        await requestApi("/api/auth/session", { method: "DELETE" });
        window.location.assign("/login");
        return;
      }
      router.refresh();
    } catch (changeError) {
      setError(thaiApiError(changeError));
    } finally { setPending(false); }
  }

  function handleDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      setConfirming(false);
      return;
    }
    if (event.key !== "Tab") return;
    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not([disabled])"),
    );
    const first = buttons[0];
    const last = buttons.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!canManage) {
    return <p className="text-sm text-[#6B7280]">บัญชีเจ้าของโรงเรียนจัดการได้โดยเจ้าของโรงเรียนเท่านั้น</p>;
  }

  return (
    <div>
      {nextStatus === "DISABLED" ? (
        <button type="button" onClick={() => setConfirming(true)} className="min-h-11 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2">ปิดใช้งานบัญชี</button>
      ) : (
        <button type="button" onClick={() => void changeStatus()} disabled={pending} className="min-h-11 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-60">เปิดใช้งานบัญชี</button>
      )}
      {error ? <p className="mt-3 text-sm text-red-700" role="alert">{error}</p> : null}
      {confirming ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4" role="presentation" onKeyDown={handleDialogKeyDown} onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirming(false); }}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="disable-title" aria-describedby="disable-description" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="disable-title" className="text-lg font-bold">ยืนยันปิดใช้งานบัญชี</h2>
            <p id="disable-description" className="mt-3 text-sm leading-6 text-[#6B7280]">{staff.firstName} {staff.lastName} จะออกจากระบบทุกอุปกรณ์ทันที และไม่สามารถเข้าสู่ระบบได้จนกว่าจะเปิดใช้งานอีกครั้ง</p>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setConfirming(false)} disabled={pending} className="min-h-11 rounded-xl border border-[#E5E7EB] px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">ยกเลิก</button><button type="button" onClick={() => void changeStatus()} disabled={pending} autoFocus className="min-h-11 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:opacity-60">{pending ? "กำลังปิดใช้งาน…" : "ยืนยัน"}</button></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
