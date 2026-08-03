import type { TodayClassResult, TodayTimetableResult } from "@classroom-os/types";
import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";

import { StartClassButton } from "./start-class-button";

const labels = {
  scheduled: "รอเริ่ม",
  live: "กำลังสอน",
  completed: "เสร็จแล้ว",
  cancelled: "ยกเลิก",
  missed: "เลยเวลา",
} as const;

export function sortTodayClassesByStartTime(classes: TodayClassResult[]): TodayClassResult[] {
  return [...classes].sort((left, right) =>
    new Date(left.scheduledStart).getTime() - new Date(right.scheduledStart).getTime()
    || left.timetableEntry.id.localeCompare(right.timetableEntry.id));
}

export function TodaySchedule({ today }: { today: TodayTimetableResult }) {
  const classes = sortTodayClassesByStartTime(today.classes);

  return (
    <section
      className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,.06)] sm:p-6"
      aria-labelledby="today-schedule-heading"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 id="today-schedule-heading" className="text-lg font-bold">ตารางสอนวันนี้</h2>
          <p className="mt-1 text-xs text-slate-500">เวลาตามเขตเวลา {today.timezone}</p>
        </div>
        <Link href="/timetable" className="text-sm font-semibold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
          ดูทั้งหมด →
        </Link>
      </div>

      {classes.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center">
          <p className="font-semibold">วันนี้ไม่มีคาบสอน</p>
          <p className="mt-1 text-sm text-slate-500">ตรวจสอบตารางสอนสำหรับวันถัดไป</p>
        </div>
      ) : (
        <ol className="relative mt-5 space-y-1 before:absolute before:bottom-5 before:left-[15px] before:top-5 before:w-px before:bg-slate-200">
          {classes.map((item, index) => {
            const current = item.status === "live"
              || (item.status === "scheduled" && item.timetableEntry.id === today.nextClass?.timetableEntry.id);
            const count = item.session?.enrolledStudentCount;

            return (
              <li
                key={item.timetableEntry.id}
                className={`relative grid grid-cols-[32px_82px_1fr_auto] items-center gap-3 rounded-xl px-2 py-3 ${current ? "bg-blue-50" : ""}`}
              >
                <span className={`z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${current ? "bg-blue-600 text-white" : item.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {index + 1}
                </span>
                <span className="text-xs font-semibold text-slate-600">
                  {item.timetableEntry.startTime}–{item.timetableEntry.endTime}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-slate-900">{item.timetableEntry.subjectName}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">
                    {item.timetableEntry.classroomName} · ห้อง {item.timetableEntry.room ?? "—"}
                    {count !== undefined ? ` · ${count} คน` : ""}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <StatusBadge variant={item.status === "completed" ? "success" : item.status === "live" ? "info" : item.status === "missed" || item.status === "cancelled" ? "warning" : "neutral"}>
                    {labels[item.status]}
                  </StatusBadge>
                  {item.status === "scheduled" || item.status === "live" ? (
                    <StartClassButton item={item} localDate={today.localDate} compact />
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
