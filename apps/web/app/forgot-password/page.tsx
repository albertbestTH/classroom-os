import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "./reset-form";

export const metadata: Metadata = { title: "ลืมรหัสผ่าน" };

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F8FA] px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm sm:p-9" aria-labelledby="forgot-password-heading">
        <p className="text-sm font-bold tracking-wide text-blue-700">Classroom OS</p>
        <h1 id="forgot-password-heading" className="mt-3 text-3xl font-bold tracking-tight text-[#111827]">
          ลืมรหัสผ่าน
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#6B7280]">
          กรอกอีเมลบัญชีของคุณ ระบบจะสร้างรหัสยืนยันสำหรับตั้งรหัสผ่านใหม่ ใน production ขั้นตอนนี้จะส่งผ่านอีเมล
        </p>
        <ForgotPasswordForm />
        <p className="mt-6 text-center text-sm text-slate-600">
          จำรหัสผ่านได้แล้ว? <Link href="/login" className="font-semibold text-blue-700 underline-offset-4 hover:underline">กลับไปเข้าสู่ระบบ</Link>
        </p>
      </section>
    </main>
  );
}
