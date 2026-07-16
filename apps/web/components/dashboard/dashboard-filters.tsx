"use client";

import type { DashboardOverviewResult } from "@classroom-os/types";
import { useState } from "react";

export function DashboardFilters({ overview }: { overview: DashboardOverviewResult }) {
  const contexts = overview.availableTeachingContexts;
  const [termId, setTermId] = useState(overview.filters.termId ?? "");
  const [teacherId, setTeacherId] = useState(overview.filters.teacherId ?? "");
  const [classroomId, setClassroomId] = useState(overview.filters.classroomId ?? "");
  const [subjectId, setSubjectId] = useState(overview.filters.subjectId ?? "");
  const teacherContexts = contexts.filter((context) => !teacherId || context.teacherId === teacherId);
  const classroomOptions = [...new Map(teacherContexts.map((context) => [context.classroomId, context.classroomName])).entries()];
  const subjectOptions = [...new Map(teacherContexts
    .filter((context) => !classroomId || context.classroomId === classroomId)
    .map((context) => [context.subjectId, context.subjectName])).entries()];

  return (
    <form method="get" className="flex flex-col gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm xl:flex-row xl:items-end" aria-label="ตัวกรองภาพรวมโรงเรียน">
      <label className="flex-1 text-sm font-medium text-[#374151]">ช่วงเวลา
        <select name="days" defaultValue={String(overview.days)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D1D5DB] bg-white px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"><option value="7">7 วันล่าสุด</option><option value="30">30 วันล่าสุด</option></select>
      </label>
      <label className="flex-1 text-sm font-medium text-[#374151]">ภาคเรียน
        <select name="termId" value={termId} onChange={(event) => { setTermId(event.target.value); setTeacherId(""); setClassroomId(""); setSubjectId(""); }} className="mt-1 min-h-11 w-full rounded-lg border border-[#D1D5DB] bg-white px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
          {overview.filterOptions.terms.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </label>
      <label className="flex-1 text-sm font-medium text-[#374151]">ครูผู้สอน
        <select name="teacherId" value={teacherId} onChange={(event) => { setTeacherId(event.target.value); setClassroomId(""); setSubjectId(""); }} className="mt-1 min-h-11 w-full rounded-lg border border-[#D1D5DB] bg-white px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
          <option value="">ครูทุกคน · ทั้งโรงเรียน</option>
          {overview.filterOptions.teachers.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </label>
      <label className="flex-1 text-sm font-medium text-[#374151]">ชั้นเรียน
        <select name="classroomId" value={classroomId} onChange={(event) => { setClassroomId(event.target.value); setSubjectId(""); }} className="mt-1 min-h-11 w-full rounded-lg border border-[#D1D5DB] bg-white px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
          <option value="">ทุกชั้นเรียน</option>
          {classroomOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      <label className="flex-1 text-sm font-medium text-[#374151]">รายวิชา
        <select name="subjectId" value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D1D5DB] bg-white px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
          <option value="">ทุกวิชา</option>
          {subjectOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      <button type="submit" className="min-h-11 rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">แสดงผล</button>
    </form>
  );
}
