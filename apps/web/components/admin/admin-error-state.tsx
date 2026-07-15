"use client";

export function AdminErrorState({ reset }: { reset: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white px-5 py-14 text-center shadow-sm" role="alert">
      <p className="font-semibold text-red-800">ไม่สามารถโหลดข้อมูลได้</p>
      <p className="mt-2 text-sm text-[#6B7280]">กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง</p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 min-h-11 rounded-xl border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
      >
        ลองอีกครั้ง
      </button>
    </div>
  );
}
