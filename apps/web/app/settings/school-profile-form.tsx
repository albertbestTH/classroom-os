"use client";

import type { SchoolProfileResult } from "@classroom-os/types";
import { useState, type FormEvent } from "react";

export function SchoolProfileForm({ initialProfile }: { initialProfile: SchoolProfileResult }) {
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/school-profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), email: form.get("email") || null, phoneNumber: form.get("phoneNumber") || null, address: form.get("address") || null }) });
    const payload = await response.json() as { error?: { message: string } };
    setMessage(response.ok ? "บันทึกข้อมูลโรงเรียนแล้ว" : payload.error?.message ?? "ไม่สามารถบันทึกได้");
  }
  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";
  return <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
    <div><h2 className="text-lg font-bold">ข้อมูลทั่วไปของโรงเรียน</h2><p className="mt-1 text-sm text-slate-600">ผู้ดูแลระบบและเจ้าของโรงเรียนแก้ไขข้อมูลส่วนนี้ได้</p></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-semibold">ชื่อโรงเรียน<input className={inputClass} name="name" defaultValue={initialProfile.name} required /></label>
      <label className="block text-sm font-semibold">รหัสโรงเรียน<input className={`${inputClass} bg-slate-100`} value={initialProfile.code} readOnly aria-describedby="school-code-note" /></label>
      <label className="block text-sm font-semibold">อีเมลโรงเรียน<input className={inputClass} name="email" type="email" defaultValue={initialProfile.email ?? ""} /></label>
      <label className="block text-sm font-semibold">เบอร์โทรศัพท์<input className={inputClass} name="phoneNumber" type="tel" defaultValue={initialProfile.phoneNumber ?? ""} /></label>
    </div>
    <p id="school-code-note" className="text-xs text-slate-500">รหัสโรงเรียนและเขตเวลาถูกล็อกเพื่อป้องกันผลกระทบต่อข้อมูลอ้างอิง</p>
    <label className="block text-sm font-semibold">ที่อยู่<textarea className={inputClass} name="address" rows={3} defaultValue={initialProfile.address ?? ""} /></label>
    <button type="submit" className="min-h-11 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">บันทึกข้อมูลโรงเรียน</button>
    {message ? <p aria-live="polite" className="text-sm font-medium text-blue-700">{message}</p> : null}
  </form>;
}
