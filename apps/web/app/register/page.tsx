import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getOptionalWebSession } from "@/lib/auth";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "สมัครใช้ Classroom OS" };

export default async function RegisterPage() {
  if (await getOptionalWebSession()) redirect("/");
  return <main className="min-h-screen bg-[#F7F8FA] px-4 py-10"><section className="mx-auto w-full max-w-2xl rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm sm:p-9"><p className="text-sm font-bold text-blue-700">Classroom OS</p><h1 className="mt-3 text-3xl font-bold">สมัครใช้งาน</h1><p className="mt-3 text-sm leading-6 text-slate-600">เลือกใช้ส่วนตัวสำหรับห้องและคาบของคุณ หรือสร้างพื้นที่โรงเรียนสำหรับหลายคน การเข้าร่วมโรงเรียนเดิมต้องได้รับคำเชิญ</p><RegisterForm /></section></main>;
}
