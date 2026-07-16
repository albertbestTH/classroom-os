"use client";

import type { ClassSessionResult, UserRole } from "@classroom-os/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { requestApi, thaiApiError } from "@/lib/client-api";

function elapsedLabel(startedAt: string | null, now: number) {
  if (!startedAt || now === 0) return "00:00";
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function LiveSessionControls({ session, role }: { session: ClassSessionResult; role: UserRole }) {
  const router = useRouter();
  const [now, setNow] = useState(0);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (session.status !== "live") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [session.status]);

  async function start() {
    setPending(true); setError(null);
    try { await requestApi(`/api/sessions/${session.id}/start`, { body: { expectedUpdatedAt: session.updatedAt } }); router.refresh(); }
    catch (startError) { setError(thaiApiError(startError)); }
    finally { setPending(false); }
  }

  async function end() {
    setPending(true); setError(null);
    try {
      await requestApi(`/api/sessions/${session.id}/end`, { body: { expectedUpdatedAt: session.updatedAt } });
      router.push(`/sessions/${session.id}/summary`);
      router.refresh();
    } catch (endError) { setError(thaiApiError(endError)); setConfirmEnd(false); }
    finally { setPending(false); }
  }

  async function cancel() {
    if (!cancelReason.trim()) return;
    setPending(true); setError(null);
    try {
      await requestApi(`/api/sessions/${session.id}/cancel`, {
        body: { reason: cancelReason, expectedUpdatedAt: session.updatedAt },
      });
      setConfirmCancel(false);
      router.refresh();
    } catch (cancelError) { setError(thaiApiError(cancelError)); }
    finally { setPending(false); }
  }

  const canCancel = session.status === "scheduled" || (session.status === "live" && role !== "TEACHER");

  return (
    <div className="space-y-4">
      {session.status === "live" ? <div className="rounded-2xl bg-blue-600 p-6 text-center text-white"><p className="text-sm font-semibold text-blue-100">เวลาที่สอนไปแล้ว</p><p className="mt-2 font-mono text-5xl font-bold tabular-nums" aria-live="off">{elapsedLabel(session.startedAt, now)}</p></div> : null}
      {session.status === "scheduled" ? <button type="button" onClick={start} disabled={pending} className="min-h-14 w-full rounded-xl bg-blue-600 px-6 text-lg font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-60">{pending ? "กำลังเริ่ม…" : "เริ่มคาบเรียน"}</button> : null}
      {session.status === "live" ? <div className="grid gap-3 sm:grid-cols-2"><Link href={`/sessions/${session.id}/attendance?classroomId=${session.classroomId}`} className="inline-flex min-h-14 items-center justify-center rounded-xl bg-blue-600 px-5 text-base font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">เช็กชื่อ</Link><button type="button" onClick={() => setConfirmEnd(true)} className="min-h-14 rounded-xl border border-red-300 bg-white px-5 text-base font-bold text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2">จบคาบเรียน</button></div> : null}
      {session.status === "completed" ? <Link href={`/sessions/${session.id}/summary`} className="inline-flex min-h-14 w-full items-center justify-center rounded-xl bg-slate-900 px-5 text-base font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2">ดูสรุปคาบเรียน</Link> : null}
      {session.status === "cancelled" ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900"><p className="font-bold">คาบเรียนถูกยกเลิก</p><p className="mt-2 text-sm">เหตุผล: {session.cancellationReason ?? "ไม่ระบุ"}</p><p className="mt-2 text-xs">ข้อมูลคาบและการเข้าเรียนเป็นแบบอ่านอย่างเดียว</p></div> : null}
      {canCancel ? <button type="button" onClick={() => setConfirmCancel(true)} className="min-h-11 w-full rounded-xl px-4 text-sm font-semibold text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600">ยกเลิกคาบเรียน</button> : null}
      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p> : null}
      {confirmEnd ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="end-session-title"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><h2 id="end-session-title" className="text-xl font-bold">ยืนยันจบคาบเรียน</h2><p className="mt-2 text-sm text-[#6B7280]">เมื่อจบคาบแล้ว การเข้าเรียนจะเป็นแบบอ่านอย่างเดียว</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setConfirmEnd(false)} className="min-h-11 rounded-xl px-4 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">ยกเลิก</button><button type="button" onClick={end} disabled={pending} className="min-h-11 rounded-xl bg-red-600 px-5 font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2">{pending ? "กำลังจบคาบ…" : "ยืนยันจบคาบ"}</button></div></div></div> : null}
      {confirmCancel ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="cancel-session-title"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><h2 id="cancel-session-title" className="text-xl font-bold">ยืนยันยกเลิกคาบเรียน</h2><p className="mt-2 text-sm text-slate-600">คาบที่ยกเลิกจะไม่ถูกนำไปคำนวณอัตราเข้าเรียน และไม่สามารถเปิดใหม่ได้</p><label className="mt-5 block text-sm font-semibold">เหตุผล <span className="text-red-700">*</span><textarea required value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} maxLength={500} rows={3} className="mt-2 w-full rounded-xl border border-slate-300 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600" /></label><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setConfirmCancel(false)} disabled={pending} className="min-h-11 rounded-xl px-4 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">กลับ</button><button type="button" onClick={cancel} disabled={pending || !cancelReason.trim()} className="min-h-11 rounded-xl bg-red-600 px-5 font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:opacity-50">{pending ? "กำลังยกเลิก…" : "ยืนยันยกเลิกคาบ"}</button></div></div></div> : null}
    </div>
  );
}
