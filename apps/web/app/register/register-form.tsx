"use client";

import type { VerificationRequestResult } from "@classroom-os/types";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export function RegisterForm() {
  const [token, setToken] = useState(""); const [message, setMessage] = useState(""); const [complete, setComplete] = useState(false);
  const [workspaceType, setWorkspaceType] = useState<"SCHOOL" | "PERSONAL">("PERSONAL");
  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";
  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(""); const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    const response = await fetch("/api/registration", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json() as { data?: VerificationRequestResult; error?: { message: string } };
    if (!response.ok || !payload.data) return setMessage(payload.error?.message ?? "สมัครไม่สำเร็จ");
    setToken(payload.data.developmentToken ?? ""); setMessage("สร้างคำขอแล้ว กรุณายืนยันอีเมล");
  }
  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const response = await fetch("/api/registration/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: form.get("token") }) });
    const payload = await response.json() as { error?: { message: string } };
    if (!response.ok) return setMessage(payload.error?.message ?? "ยืนยันไม่สำเร็จ");
    setComplete(true); setMessage("สมัครสำเร็จแล้ว คุณสามารถเข้าสู่ระบบได้");
  }
  if (complete) return <div className="mt-8 space-y-4"><p role="status" className="rounded-xl bg-emerald-50 p-4 font-medium text-emerald-800">{message}</p><Link href="/login" className="inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white">เข้าสู่ระบบ</Link></div>;
  return <div className="mt-8 space-y-6">
    <form onSubmit={register} className="grid gap-4 sm:grid-cols-2">
      <fieldset className="grid gap-3 sm:col-span-2"><legend className="text-sm font-semibold">รูปแบบการใช้งาน</legend><label className="flex min-h-11 items-center gap-3 rounded-xl border p-3"><input type="radio" name="workspaceType" value="PERSONAL" checked={workspaceType === "PERSONAL"} onChange={() => setWorkspaceType("PERSONAL")} />ครูใช้ส่วนตัว — จัดการเฉพาะห้องและคาบของตนเอง</label><label className="flex min-h-11 items-center gap-3 rounded-xl border p-3"><input type="radio" name="workspaceType" value="SCHOOL" checked={workspaceType === "SCHOOL"} onChange={() => setWorkspaceType("SCHOOL")} />โรงเรียนใช้งาน — มีผู้ดูแลและครูหลายคน</label></fieldset>
      {workspaceType === "SCHOOL" ? <><label className="text-sm font-semibold sm:col-span-2">ชื่อโรงเรียน<input className={inputClass} name="schoolName" required /></label><label className="text-sm font-semibold">รหัสโรงเรียน<input className={inputClass} name="schoolCode" pattern="[A-Za-z0-9_-]+" required /></label></> : <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900 sm:col-span-2">ระบบจะสร้างพื้นที่ส่วนตัวที่แยกจากโรงเรียนและครูคนอื่นให้โดยอัตโนมัติ</p>}
      <label className="text-sm font-semibold">เบอร์โทรศัพท์<input className={inputClass} name="phoneNumber" type="tel" /></label>
      <label className="text-sm font-semibold">ชื่อผู้ดูแล<input className={inputClass} name="firstName" required /></label>
      <label className="text-sm font-semibold">นามสกุล<input className={inputClass} name="lastName" required /></label>
      <label className="text-sm font-semibold sm:col-span-2">อีเมล<input className={inputClass} name="email" type="email" autoComplete="email" required /></label>
      <label className="text-sm font-semibold sm:col-span-2">รหัสผ่าน<input className={inputClass} name="password" type="password" autoComplete="new-password" minLength={12} required /><span className="mt-1 block text-xs font-normal text-slate-500">อย่างน้อย 12 ตัว มีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ตัวเลข และสัญลักษณ์</span></label>
      <button type="submit" className="min-h-11 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white sm:col-span-2">{workspaceType === "PERSONAL" ? "สร้างพื้นที่สอนส่วนตัว" : "สร้างโรงเรียนใหม่"}</button>
    </form>
    {token ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">รหัสสำหรับสภาพแวดล้อมพัฒนา: <code>{token}</code></p> : null}
    <form onSubmit={confirm} className="space-y-3 border-t pt-5"><label className="block text-sm font-semibold">รหัสยืนยันอีเมล<input className={inputClass} name="token" value={token} onChange={(event) => setToken(event.target.value)} required /></label><button type="submit" className="min-h-11 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white">ยืนยันการสมัคร</button></form>
    {message ? <p aria-live="polite" className="text-sm font-medium text-blue-700">{message}</p> : null}
  </div>;
}
