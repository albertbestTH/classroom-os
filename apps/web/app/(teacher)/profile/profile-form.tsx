"use client";

import type { CurrentUserResult, VerificationRequestResult } from "@classroom-os/types";
import { useState, type ChangeEvent, type FormEvent } from "react";

async function mutation<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json() as { data?: T; error?: { message: string } };
  if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "ไม่สามารถบันทึกข้อมูลได้");
  return payload.data;
}

export function ProfileForm({ initialUser }: { initialUser: CurrentUserResult }) {
  const [user, setUser] = useState(initialUser);
  const [message, setMessage] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [developmentToken, setDevelopmentToken] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(""); setProfileMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName: form.get("firstName"), lastName: form.get("lastName"), phoneNumber: form.get("phoneNumber") || null }) });
      const payload = await response.json() as { data?: CurrentUserResult; error?: { message: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "ไม่สามารถบันทึกข้อมูลได้");
      setUser(payload.data); setProfileMessage("บันทึกโปรไฟล์สำเร็จแล้ว"); window.setTimeout(() => setProfileMessage(""), 3000);
    } catch (error) { setProfileMessage(error instanceof Error ? error.message : "ไม่สามารถบันทึกข้อมูลได้"); }
  }

  async function uploadProfileImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage(""); setUploadingImage(true);
    try {
      const form = new FormData(); form.append("image", file);
      const response = await fetch("/api/profile/image", { method: "POST", body: form });
      const payload = await response.json() as { data?: CurrentUserResult; error?: { message: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "ไม่สามารถอัปโหลดรูปได้");
      setUser(payload.data); setProfileMessage("อัปโหลดรูปโปรไฟล์สำเร็จแล้ว"); window.setTimeout(() => setProfileMessage(""), 3000);
    } catch (error) { setProfileMessage(error instanceof Error ? error.message : "ไม่สามารถอัปโหลดรูปได้"); }
    finally { setUploadingImage(false); }
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

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      await mutation("/api/profile/password", { currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword") });
      setMessage("เปลี่ยนรหัสผ่านแล้ว กรุณาเข้าสู่ระบบอีกครั้ง");
      window.location.assign("/login");
    } catch (error) { setMessage(error instanceof Error ? error.message : "ไม่สามารถเปลี่ยนรหัสผ่านได้"); }
  }

  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";
  return <><div className="mt-8 grid gap-6 lg:grid-cols-2">
    <form onSubmit={saveProfile} className="space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold">ข้อมูลส่วนตัว</h2>
      <div className="flex items-center gap-4"><div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-2xl font-bold text-blue-700">{user.profileImageKey ? <img src={user.profileImageKey} alt={`รูปโปรไฟล์ของ ${user.firstName} ${user.lastName}`} className="h-full w-full object-cover" /> : user.firstName.slice(0, 1)}</div><div><p className="text-sm font-semibold">รูปโปรไฟล์</p><p className="mt-1 text-xs text-slate-500">JPG, PNG หรือ WebP ไม่เกิน 2 MB</p><label className="mt-2 inline-flex min-h-10 cursor-pointer items-center rounded-lg border border-blue-600 px-3 py-2 text-sm font-semibold text-blue-700">{uploadingImage ? "กำลังอัปโหลด…" : "เลือกและอัปโหลด"}<input name="image" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadProfileImage} disabled={uploadingImage} className="sr-only" /></label></div></div>
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
    <form onSubmit={changePassword} className="space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm lg:col-span-2">
      <h2 className="text-lg font-bold">เปลี่ยนรหัสผ่าน</h2>
      <p className="text-sm text-slate-600">หลังเปลี่ยนรหัสผ่าน ระบบจะให้ออกจากระบบทุกอุปกรณ์เพื่อความปลอดภัย</p>
      <label className="block text-sm font-semibold">รหัสผ่านปัจจุบัน<input className={inputClass} name="currentPassword" type="password" autoComplete="current-password" required /></label>
      <label className="block text-sm font-semibold">รหัสผ่านใหม่<input className={inputClass} name="newPassword" type="password" autoComplete="new-password" minLength={12} required /><span className="mt-1 block text-xs font-normal text-slate-500">อย่างน้อย 12 ตัว มีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ตัวเลข และสัญลักษณ์</span></label>
      <button type="submit" className="min-h-11 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white focus-visible:ring-2 focus-visible:ring-slate-900">เปลี่ยนรหัสผ่านและออกจากระบบทุกอุปกรณ์</button>
    </form>
  </div>{profileMessage ? <div role="status" aria-live="polite" className="fixed right-4 top-4 z-50 rounded-xl border border-emerald-200 bg-white px-5 py-4 text-sm font-semibold text-emerald-700 shadow-lg">✓ {profileMessage}</div> : null}</>;
}
