"use client";

import type { DashboardOverviewResult } from "@classroom-os/types";
import { useState } from "react";

export function TeacherContextFilters({ overview }: { overview: DashboardOverviewResult }) {
  const contexts = overview.availableTeachingContexts;
  const selected = overview.selectedTeachingContext;
  const [classroomId, setClassroomId] = useState(selected?.classroomId ?? overview.filters.classroomId ?? "");
  const [subjectId, setSubjectId] = useState(selected?.subjectId ?? overview.filters.subjectId ?? "");

  if (contexts.length === 0) {
    return <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">ยังไม่มีชั้นเรียนที่ได้รับมอบหมายในภาคเรียนปัจจุบัน</p>;
  }
  if (contexts.length === 1) {
    const context = contexts[0]!;
    return <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"><strong>ชั้นเรียนของฉัน:</strong> {context.classroomName} · {context.subjectName}</p>;
  }

  const classroomOptions = [...new Map(contexts.map((context) => [context.classroomId, context.classroomName])).entries()];
  const subjects = contexts.filter((context) => context.classroomId === classroomId);
  const subjectOptions = [...new Map(subjects.map((context) => [context.subjectId, context.subjectName])).entries()];

  return (
    <form method="get" className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 sm:flex-row sm:items-end" aria-label="เลือกชั้นเรียนของฉัน">
      <label className="flex-1 text-sm font-semibold text-blue-950">ชั้นเรียนของฉัน
        <select name="classroomId" value={classroomId} onChange={(event) => {
          const nextClassroom = event.target.value;
          setClassroomId(nextClassroom);
          const nextSubjects = contexts.filter((context) => context.classroomId === nextClassroom);
          setSubjectId(new Set(nextSubjects.map((context) => context.subjectId)).size === 1 ? nextSubjects[0]!.subjectId : "");
        }} className="mt-1 min-h-11 w-full rounded-lg border border-blue-200 bg-white px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
          <option value="">ทุกชั้นเรียนที่ได้รับมอบหมาย</option>
          {classroomOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      <label className="flex-1 text-sm font-semibold text-blue-950">รายวิชา
        <select name="subjectId" value={subjectId} disabled={!classroomId} onChange={(event) => setSubjectId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-blue-200 bg-white px-3 disabled:bg-slate-100 disabled:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
          <option value="">{classroomId ? "ทุกวิชาที่สอนในชั้นนี้" : "เลือกชั้นเรียนก่อน"}</option>
          {subjectOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      <button type="submit" className="min-h-11 rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">ดูภาพรวม</button>
    </form>
  );
}
