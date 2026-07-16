"use client";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen bg-[#F7F8FA] px-4 py-16 text-[#111827] lg:ml-64">
      <section className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm" role="alert">
        <h1 className="text-2xl font-bold">โหลดภาพรวมไม่สำเร็จ</h1>
        <p className="mt-2 text-sm leading-6 text-[#6B7280]">กรุณาลองอีกครั้ง ข้อมูลภายในระบบไม่ได้ถูกแก้ไข</p>
        <button type="button" onClick={reset} className="mt-6 min-h-11 rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">ลองอีกครั้ง</button>
      </section>
    </main>
  );
}
