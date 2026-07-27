"use client";

import type { DashboardOverviewResult } from "@classroom-os/types";
import { useState } from "react";

export function TeacherContextFilters({ overview }: { overview: DashboardOverviewResult }) {
  const contexts = overview.availableTeachingContexts;
  const selected = overview.selectedTeachingContext;
  const [classroomId, setClassroomId] = useState(selected?.classroomId ?? overview.filters.classroomId ?? "");
  const [subjectId, setSubjectId] = useState(selected?.subjectId ?? overview.filters.subjectId ?? "");
  if (contexts.length === 0) return <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">ยังไม่มีชั้นเรียนที่ได้รับมอบหมายในภาคเรียนปัจจุบัน</p>;
  if (contexts.length === 1) { const context = contexts[0]!; return <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm"><strong className="text-slate-900">ชั้นเรียนของฉัน:</strong> {context.classroomName} · {context.subjectName}</p>; }
  const classroomOptions = [...new Map(contexts.map((context) => [context.classroomId, context.classroomName])).entries()];
  const subjectOptions = [...new Map(contexts.filter((context) => context.classroomId === classroomId).map((context) => [context.subjectId, context.subjectName])).entries()];
  return <form method="get" className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-end" aria-label="ตัวกรองชั้นเรียนของฉัน">
    <label className="flex-1 text-xs font-semibold text-slate-600">ชั้นเรียน<select name="classroomId" value={classroomId} onChange={(event) => { const next = event.target.value; setClassroomId(next); const subjects = contexts.filter((context) => context.classroomId === next); setSubjectId(new Set(subjects.map((context) => context.subjectId)).size === 1 ? subjects[0]!.subjectId : ""); }} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"><option value="">ทุกชั้นเรียนที่รับผิดชอบ</option>{classroomOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    <label className="flex-1 text-xs font-semibold text-slate-600">รายวิชา<select name="subjectId" value={subjectId} disabled={!classroomId} onChange={(event) => setSubjectId(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 disabled:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"><option value="">{classroomId ? "ทุกวิชาในชั้นนี้" : "เลือกชั้นเรียนก่อน"}</option>{subjectOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    <button type="submit" className="min-h-10 rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">ดูภาพรวม</button>
  </form>;
}
