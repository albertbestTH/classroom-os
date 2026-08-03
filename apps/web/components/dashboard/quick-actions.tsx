import { BarChart3, CircleCheckBig, ClipboardCheck, CalendarDays, Users } from "lucide-react";
import Link from "next/link";
import type { TodayClassResult } from "@classroom-os/types";

type ActionState = "idle" | "partial" | "complete" | "empty";

export function getAttendanceActionState(item: TodayClassResult | null) {
  const total = item?.session?.enrolledStudentCount ?? 0;
  const checked = item?.session?.attendanceRecordedCount ?? 0;
  const state: ActionState = !item ? "empty" : total > 0 && checked >= total ? "complete" : checked > 0 ? "partial" : "idle";
  const sessionHref = item?.session ? `/sessions/${item.session.id}` : "/attendance";
  const attendanceHref = item?.session
    ? `/sessions/${item.session.id}/attendance?classroomId=${item.session.classroomId}`
    : "/attendance";

  if (state === "complete") return { state, title: "เช็กชื่อแล้ว", caption: `ครบ ${total}/${total} คน`, href: sessionHref, icon: CircleCheckBig, tone: "bg-emerald-50 text-emerald-600" };
  if (state === "partial") return { state, title: "เช็กชื่อต่อ", caption: `เช็กแล้ว ${checked}/${total} คน`, href: attendanceHref, icon: ClipboardCheck, tone: "bg-amber-50 text-amber-600" };
  if (state === "empty") return { state, title: "เช็กชื่อ", caption: "ดูรายการคาบเรียน", href: "/timetable", icon: ClipboardCheck, tone: "bg-emerald-50 text-emerald-600" };
  return { state, title: "เช็กชื่อ", caption: "บันทึกการเข้าเรียน", href: attendanceHref, icon: ClipboardCheck, tone: "bg-emerald-50 text-emerald-600" };
}

type Props = { attendanceClass?: TodayClassResult | null };

export function QuickActions({ attendanceClass = null }: Props) {
  const attendance = getAttendanceActionState(attendanceClass);
  const actions = [
    { href: attendance.href, label: attendance.title, Icon: attendance.icon, tone: attendance.tone },
    { href: "/timetable", label: "ตารางสอน", Icon: CalendarDays, tone: "bg-blue-50 text-blue-600" },
    { href: "/classrooms", label: "ชั้นเรียน", Icon: Users, tone: "bg-orange-50 text-orange-600" },
    { href: "/reports", label: "ดูรายงาน", Icon: BarChart3, tone: "bg-violet-50 text-violet-600" },
  ];

  return <div className="grid grid-cols-4 gap-1.5 sm:gap-2" aria-label="ทางลัดการทำงาน">{actions.map(({ href, label, Icon, tone }) => <Link key={`${href}:${label}`} href={href} className="group flex min-h-[88px] min-w-0 flex-col items-center justify-start gap-2 rounded-xl px-1 py-2 text-center transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:-translate-y-0.5 ${tone}`}><Icon size={20} strokeWidth={2} aria-hidden="true" /></span><span className="block whitespace-nowrap text-[11px] font-bold leading-5 text-slate-900 sm:text-xs">{label}</span></Link>)}</div>;
}
