import type { TodayClassResult } from "@classroom-os/types";
import Link from "next/link";

import { StartClassButton } from "@/components/classroom/start-class-button";

type NextClassCardProps = {
  nextClass: TodayClassResult | null;
  liveSession: TodayClassResult | null;
  localDate: string;
};

export function NextClassCard({ nextClass, liveSession, localDate }: NextClassCardProps) {
  const item = liveSession ?? nextClass;
  return (
    <section className={`rounded-2xl border p-5 shadow-sm sm:p-6 ${liveSession ? "border-blue-200 bg-blue-50" : "border-[#E5E7EB] bg-white"}`} aria-labelledby="next-class-heading">
      <p className={`text-sm font-semibold ${liveSession ? "text-blue-700" : "text-[#6B7280]"}`}>{liveSession ? "คาบที่กำลังสอน" : "คาบถัดไป"}</p>
      <h2 id="next-class-heading" className="mt-1 text-xl font-bold">{item ? item.timetableEntry.subjectName : "ไม่มีคาบที่ต้องดำเนินการ"}</h2>
      {item ? (
        <>
          <p className="mt-2 text-[#4B5563]">{item.timetableEntry.classroomName} · ห้อง {item.timetableEntry.room ?? "—"}</p>
          <p className="mt-1 text-sm text-[#6B7280]">{item.timetableEntry.startTime}–{item.timetableEntry.endTime}</p>
          <div className="mt-5">
            {liveSession?.session ? (
              <Link href={`/sessions/${liveSession.session.id}`} className="inline-flex min-h-11 items-center rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">กลับเข้าสู่คาบเรียน</Link>
            ) : (
              <StartClassButton item={item} localDate={localDate} />
            )}
          </div>
        </>
      ) : <p className="mt-4 text-sm text-[#6B7280]">ตรวจสอบตารางสอนสำหรับคาบในวันถัดไป</p>}
    </section>
  );
}
