"use client";

import type { CurrentUserResult, VerificationRequestResult } from "@classroom-os/types";
import { useState, type FormEvent } from "react";

async function mutation<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json() as { data?: T; error?: { message: string } };
  if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "ไม่สามารถบันทึกข้อมูลได้");
  return payload.data;
}

export function ProfileForm({ initialUser }: { initialUser: CurrentUserResult }) {
  const [user, setUser] = useState(initialUser);
  const [message, setMessage] = useState("");
  const [developmentToken, setDevelopmentToken] = useState("");

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName: form.get("firstName"), lastName: form.get("lastName"), phoneNumber: form.get("phoneNumber") || null }) });
      const payload = await response.json() as { data?: CurrentUserResult; error?: { message: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "ไม่สามารถบันทึกข้อมูลได้");
      setUser(payload.data); setMessage("บันทึกโปรไฟล์แล้ว");
    } catch (error) { setMessage(error instanceof Error ? error.message : "ไม่สามารถบันทึกข้อมูลได้"); }
  }

  async function requestEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await mutation<VerificationRequestResult>("/api/profile/email-change", { newEmail: form.get("newEmail"), currentPassword: form.get("currentPassword") });
      setDevelopmentToken(result.developmentToken ?? ""); setMessage("ส่งคำขอยืนยันอีเมลแล้ว");
    } catch (error) { setMessage(error instanceof Error ? error.message : "ไม่สามารถส่งคำขอได้"); }
  }

  async function confirmEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    try { await mutation("/api/profile/email-change/confirm", { token: form.get("token") }); window.location.assign("/login"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "ยืนยันอีเมลไม่สำเร็จ"); }
  }

  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";
  return <div className="mt-8 grid gap-6 lg:grid-cols-2">
    <form onSubmit={saveProfile} className="space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold">ข้อมูลส่วนตัว</h2>
      <label className="block text-sm font-semibold">ชื่อ<input className={inputClass} name="firstName" defaultValue={user.firstName} required /></label>
      <label className="block text-sm font-semibold">นามสกุล<input className={inputClass} name="lastName" defaultValue={user.lastName} required /></label>
      <label className="block text-sm font-semibold">เบอร์โทรศัพท์<input className={inputClass} name="phoneNumber" type="tel" defaultValue={user.phoneNumber ?? ""} /></label>
      <button type="submit" className="min-h-11 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">บันทึกโปรไฟล์</button>
    </form>
    <div className="space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold">เปลี่ยนอีเมล</h2><p className="text-sm text-slate-600">อีเมลปัจจุบัน: {user.email}</p>
      <form onSubmit={requestEmail} className="space-y-4">
        <label className="block text-sm font-semibold">อีเมลใหม่<input className={inputClass} name="newEmail" type="email" required /></label>
        <label className="block text-sm font-semibold">รหัสผ่านปัจจุบัน<input className={inputClass} name="currentPassword" type="password" autoComplete="current-password" required /></label>
        <button type="submit" className="min-h-11 rounded-xl border border-blue-600 px-5 py-3 font-semibold text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600">ขอรหัสยืนยัน</button>
      </form>
      {developmentToken ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">รหัสสำหรับสภาพแวดล้อมพัฒนา: <code>{developmentToken}</code></p> : null}
      <form onSubmit={confirmEmail} className="space-y-3">
        <label className="block text-sm font-semibold">รหัสยืนยัน<input className={inputClass} name="token" defaultValue={developmentToken} required /></label>
        <button type="submit" className="min-h-11 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white focus-visible:ring-2 focus-visible:ring-slate-900">ยืนยันและออกจากระบบทุกอุปกรณ์</button>
      </form>
      {message ? <p aria-live="polite" className="text-sm font-medium text-blue-700">{message}</p> : null}
    </div>
  </div>;
}
