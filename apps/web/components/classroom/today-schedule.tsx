import type { TodayTimetableResult } from "@classroom-os/types";
import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { StartClassButton } from "./start-class-button";

const labels = {
  scheduled: "รอเริ่ม",
  live: "กำลังสอน",
  completed: "เสร็จแล้ว",
  missed: "ยังไม่ได้เริ่ม",
} as const;

export function TodaySchedule({ today }: { today: TodayTimetableResult }) {
  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="today-schedule-heading">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="today-schedule-heading" className="text-xl font-bold">ตารางสอนวันนี้</h2>
          <p className="mt-1 text-sm text-[#6B7280]">เวลาตามเขตเวลา {today.timezone}</p>
        </div>
        <Link href="/timetable" className="rounded-md text-sm font-semibold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">ดูทั้งสัปดาห์ →</Link>
      </div>
      {today.classes.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center">
          <p className="font-semibold">วันนี้ไม่มีคาบเรียน</p>
          <p className="mt-1 text-sm text-[#6B7280]">ตรวจสอบตารางสอนหรือภาคเรียนปัจจุบัน</p>
        </div>
      ) : (
        <ol className="mt-5 divide-y divide-slate-100">
          {today.classes.map((item) => (
            <li key={item.timetableEntry.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
              <div className="w-28 shrink-0 text-sm">
                <p className="font-bold">{item.timetableEntry.startTime}–{item.timetableEntry.endTime}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{item.timetableEntry.subjectName} · {item.timetableEntry.classroomName}</p>
                <p className="mt-1 text-sm text-[#6B7280]">{item.timetableEntry.teacherName} · ห้อง {item.timetableEntry.room ?? "—"}</p>
              </div>
              <StatusBadge variant={item.status === "completed" ? "success" : item.status === "live" ? "info" : item.status === "missed" ? "warning" : "neutral"}>{labels[item.status]}</StatusBadge>
              {(item.status === "scheduled" || item.status === "live") ? <StartClassButton item={item} localDate={today.localDate} compact /> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
