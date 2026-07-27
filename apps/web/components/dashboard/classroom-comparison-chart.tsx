"use client";

import type { DashboardClassroomComparison } from "@classroom-os/types";

export function ClassroomComparisonChart({ classrooms }: { classrooms: DashboardClassroomComparison[] }) {
  if (classrooms.length === 0) return <div className="rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center" role="status"><p className="font-semibold">ยังไม่มีข้อมูลห้องเรียน</p><p className="mt-1 text-sm text-slate-500">จะแสดงแนวโน้มเมื่อมีข้อมูลการเข้าเรียนย้อนหลัง</p></div>;
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="แนวโน้มการเข้าเรียนรายห้องเรียน">{classrooms.slice(0, 4).map((item) => <article key={`${item.classroomId}:${item.subjectId}`} className="rounded-xl bg-white p-3 shadow-[0_4px_14px_rgba(15,23,42,.05)]"><div className="flex items-start justify-between gap-2"><div><h3 className="text-sm font-bold text-slate-900">{item.classroomName}</h3><p className="mt-1 text-xs text-slate-500">{item.eligibleCount} นักเรียน</p></div><strong className="text-base text-emerald-600">{item.attendancePercentage === null ? "—" : `${item.attendancePercentage}%`}</strong></div><div className="mt-4 flex h-10 items-end gap-1" aria-hidden="true">{[0, 1, 2, 3, 4].map((point) => <span key={point} className="h-1 w-full rounded-full bg-slate-200" />)}</div><p className="mt-2 text-[11px] text-slate-400">ยังไม่มีประวัติรายวัน</p></article>)}</div>;
}
