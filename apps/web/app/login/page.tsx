import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";

import { getOptionalWebSession, safeCallbackPath } from "@/lib/auth";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (await getOptionalWebSession()) redirect("/");
  const params = await searchParams;
  const rawCallback = Array.isArray(params.callbackUrl) ? params.callbackUrl[0] : params.callbackUrl;
  const callbackUrl = safeCallbackPath(rawCallback ?? null);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F8FA] px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm sm:p-9" aria-labelledby="login-heading">
        <p className="text-sm font-bold tracking-wide text-blue-700">Classroom OS</p>
        <h1 id="login-heading" className="mt-3 text-3xl font-bold tracking-tight text-[#111827]">
          เข้าสู่ระบบสำหรับบุคลากร
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#6B7280]">
          ใช้บัญชีของโรงเรียนเพื่อจัดการชั้นเรียน ตารางสอน และผลการเรียน
        </p>
        <LoginForm callbackUrl={callbackUrl} />
        <p className="mt-6 text-center text-sm text-slate-600">ยังไม่มีโรงเรียน? <Link href="/register" className="font-semibold text-blue-700 underline-offset-4 hover:underline">สมัครใช้งาน</Link></p>
      </section>
    </main>
  );
}
