"use client";

import type { StaffUserResult, UserRole } from "@classroom-os/types";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { ApiClientError, requestApi, thaiApiError } from "@/lib/client-api";

const inputStyles = "min-h-11 w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";

export function CreateStaffForm() {
  const router = useRouter();
  const formId = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("temporaryPassword") ?? "");
    const nextErrors: Record<string, string> = {};
    if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      nextErrors.temporaryPassword = "อย่างน้อย 12 ตัวอักษร และต้องมีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ตัวเลข และสัญลักษณ์";
    }
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }
    setPending(true);
    try {
      const staff = await requestApi<StaffUserResult>("/api/staff", {
        body: {
          firstName: data.get("firstName"), lastName: data.get("lastName"), email: data.get("email"),
          role: data.get("role") as UserRole, temporaryPassword: password,
        },
      });
      form.reset();
      router.replace(`/staff/${staff.id}`);
      router.refresh();
    } catch (submitError) {
      if (submitError instanceof ApiClientError && submitError.fieldErrors) {
        const mapped = Object.fromEntries(Object.entries(submitError.fieldErrors).map(([key, messages]) => [key, messages[0] ?? "ข้อมูลไม่ถูกต้อง"]));
        setFieldErrors(mapped);
      }
      setError(thaiApiError(submitError));
    } finally { setPending(false); }
  }

  return (
    <form onSubmit={submit} className="mt-8 max-w-3xl rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6" aria-labelledby={`${formId}-heading`}>
      <h2 id={`${formId}-heading`} className="text-lg font-bold">ข้อมูลบัญชี</h2>
      <p className="mt-1 text-sm text-[#6B7280]">รหัสผ่านชั่วคราวจะถูกส่งเพียงครั้งเดียวและจะไม่แสดงหลังบันทึก</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {([['firstName','ชื่อ','สมชาย'],['lastName','นามสกุล','ใจดี']] as const).map(([name,label,placeholder]) => <div key={name}><label htmlFor={`${formId}-${name}`} className="mb-2 block text-sm font-semibold">{label}</label><input id={`${formId}-${name}`} name={name} required autoComplete="off" placeholder={placeholder} className={inputStyles} /></div>)}
        <div className="sm:col-span-2"><label htmlFor={`${formId}-email`} className="mb-2 block text-sm font-semibold">อีเมล</label><input id={`${formId}-email`} name="email" type="email" required autoComplete="off" placeholder="teacher@school.example" className={inputStyles} />{fieldErrors.email ? <p className="mt-2 text-sm text-red-700">กรุณากรอกอีเมลให้ถูกต้อง</p> : null}</div>
        <div><label htmlFor={`${formId}-role`} className="mb-2 block text-sm font-semibold">บทบาท</label><select id={`${formId}-role`} name="role" required className={inputStyles}><option value="TEACHER">ครูผู้สอน</option><option value="ADMIN">ผู้ดูแลระบบ</option></select></div>
        <div><label htmlFor={`${formId}-password`} className="mb-2 block text-sm font-semibold">รหัสผ่านชั่วคราว</label><input id={`${formId}-password`} name="temporaryPassword" type="password" required minLength={12} maxLength={128} autoComplete="new-password" aria-describedby={`${formId}-password-help`} className={inputStyles} /><p id={`${formId}-password-help`} className={`mt-2 text-xs ${fieldErrors.temporaryPassword ? "text-red-700" : "text-[#6B7280]"}`}>{fieldErrors.temporaryPassword ?? "12–128 ตัวอักษร พร้อมตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ตัวเลข และสัญลักษณ์"}</p></div>
      </div>
      {error ? <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p> : null}
      <div className="mt-6 flex justify-end"><button type="submit" disabled={pending} className="min-h-11 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-60">{pending ? "กำลังสร้างบัญชี…" : "สร้างบัญชี"}</button></div>
    </form>
  );
}
