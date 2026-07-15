"use client";

export default function StudentsError({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F8FA] px-4">
      <section className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center">
        <h1 className="text-xl font-bold text-[#111827]">ไม่สามารถเปิดหน้ารายชื่อนักเรียนได้</h1>
        <p className="mt-2 text-sm text-[#6B7280]">กรุณาลองใหม่อีกครั้ง โดยไม่มีการแสดงรายละเอียดภายในระบบ</p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 min-h-11 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          ลองอีกครั้ง
        </button>
      </section>
    </main>
  );
}
