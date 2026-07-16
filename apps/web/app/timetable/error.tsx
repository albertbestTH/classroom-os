"use client";

export default function TimetableError({ reset }: { error: Error; reset: () => void }) {
  return <div className="min-h-screen bg-[#F7F8FA] p-6 lg:ml-64 lg:p-10"><div className="rounded-2xl border border-red-200 bg-white p-8"><h1 className="text-xl font-bold">โหลดตารางสอนไม่สำเร็จ</h1><p className="mt-2 text-sm text-[#6B7280]">กรุณาลองใหม่อีกครั้ง</p><button type="button" onClick={reset} className="mt-5 min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">ลองใหม่</button></div></div>;
}
