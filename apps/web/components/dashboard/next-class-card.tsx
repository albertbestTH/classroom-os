import type { TodayClassResult } from "@classroom-os/types";
import Link from "next/link";

import { StartClassButton } from "@/components/classroom/start-class-button";
import { NextClassIllustration } from "@/components/dashboard/next-class-illustration";
import { getAttendanceActionState } from "@/components/dashboard/quick-actions";

type NextClassCardProps = { nextClass: TodayClassResult | null; liveSession: TodayClassResult | null; localDate: string };

function minutesUntil(iso: string) { return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60000)); }

export function NextClassCard({ nextClass, liveSession, localDate }: NextClassCardProps) {
  const item = liveSession ?? nextClass;
  const recorded = item?.session?.attendanceRecordedCount ?? 0;
  const enrolled = item?.session?.enrolledStudentCount ?? 0;
  const percentage = enrolled ? Math.round((recorded / enrolled) * 100) : 0;
  const attendanceAction = item ? getAttendanceActionState(item) : null;
  const variant = liveSession ? "active" : item ? "upcoming" : "empty";
  return <section className="self-start min-h-[300px] rounded-[18px] bg-gradient-to-br from-[#2367F2] to-[#0638C7] p-6 text-white shadow-[0_20px_45px_-28px_rgba(7,52,165,0.85)] sm:p-7" aria-labelledby="next-class-heading">
    <div className="flex items-start justify-between gap-3"><p className="pt-2 text-sm font-semibold text-blue-100">{liveSession ? "กำลังสอน" : "คาบถัดไปใน"}</p><div className="flex items-center gap-3"><NextClassIllustration variant={variant} /><span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">{liveSession ? "กำลังสอน" : item ? `เริ่มใน ${minutesUntil(item.scheduledStart)} นาที` : "ไม่มีคาบ"}</span></div></div>
    {item ? <><div className="mt-1 grid gap-5 sm:grid-cols-[0.8fr_1.2fr]"><div><p className="text-4xl font-bold tracking-tight">{liveSession ? "กำลังสอน" : `${minutesUntil(item.scheduledStart)} นาที`}</p><p className="mt-2 text-sm text-blue-100">เริ่มเวลา {item.timetableEntry.startTime}</p></div><div><h2 id="next-class-heading" className="text-2xl font-bold">{item.timetableEntry.subjectName}</h2><p className="mt-2 text-blue-100">{item.timetableEntry.classroomName} · ห้อง {item.timetableEntry.room ?? "—"}</p></div></div><div className="mt-5"><div className="flex items-center justify-between text-[13px] font-semibold"><span>เช็กชื่อแล้ว {recorded}/{enrolled} คน</span><span>{percentage}%</span></div><div className="mt-2 h-2 rounded-full bg-white/20"><div className="h-2 rounded-full bg-emerald-400" style={{ width: `${percentage}%` }} /></div></div><div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">{liveSession?.session ? <Link href={`/sessions/${liveSession.session.id}`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 py-3 font-bold text-[#123D9A] hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">{attendanceAction?.title ?? "เช็กชื่อ"}</Link> : <StartClassButton item={item} localDate={localDate} inverse />}<Link href={liveSession?.session ? `/sessions/${liveSession.session.id}` : "/timetable"} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/50 px-5 py-3 font-semibold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">ดูรายละเอียด</Link></div></> : <><h2 id="next-class-heading" className="mt-4 text-2xl font-bold">ไม่มีคาบที่ต้องดำเนินการ</h2><p className="mt-2 max-w-sm text-blue-100">ตรวจสอบตารางสอนสำหรับคาบในวันถัดไป</p></>}
  </section>;
}
