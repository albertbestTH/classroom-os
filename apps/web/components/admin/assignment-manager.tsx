"use client";

import type { AcademicYearResult, ClassroomResult, StaffUserResult, SubjectResult, TeachingAssignmentResult, TermResult } from "@classroom-os/types";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";

import { EmptyCollectionState } from "@/components/admin/admin-state";
import { requestApi, thaiApiError } from "@/lib/client-api";

const selectStyles = "min-h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";

export function AssignmentManager({ staffId, teachers, academicYears, terms, classrooms, subjects, assignments }: { staffId: string; teachers: StaffUserResult[]; academicYears: AcademicYearResult[]; terms: TermResult[]; classrooms: ClassroomResult[]; subjects: SubjectResult[]; assignments: TeachingAssignmentResult[] }) {
  const router = useRouter();
  const formId = useId();
  const currentYear = academicYears.find((item) => item.isCurrent)?.id ?? academicYears[0]?.id ?? "";
  const [yearId, setYearId] = useState(currentYear);
  const availableTerms = useMemo(() => terms.filter((term) => term.academicYearId === yearId), [terms, yearId]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true); setError(null);
    try {
      await requestApi<TeachingAssignmentResult>(`/api/staff/${staffId}/teaching-assignments`, {
        body: { termId: data.get("termId"), classroomId: data.get("classroomId"), subjectId: data.get("subjectId") },
      });
      router.refresh();
    } catch (submitError) { setError(thaiApiError(submitError)); }
    finally { setPending(false); }
  }

  return (
    <div className="mt-8 space-y-6">
      <form onSubmit={submit} className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm" aria-labelledby={`${formId}-heading`}>
        <h2 id={`${formId}-heading`} className="text-lg font-bold">เพิ่มงานสอน</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div><label htmlFor={`${formId}-teacher`} className="mb-2 block text-sm font-semibold">ครู</label><select id={`${formId}-teacher`} value={staffId} onChange={(event) => router.push(`/staff/${event.target.value}/assignments`)} className={selectStyles}>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.firstName} {teacher.lastName}</option>)}</select></div>
          <div><label htmlFor={`${formId}-year`} className="mb-2 block text-sm font-semibold">ปีการศึกษา</label><select id={`${formId}-year`} value={yearId} onChange={(event) => setYearId(event.target.value)} className={selectStyles}>{academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></div>
          <div><label htmlFor={`${formId}-term`} className="mb-2 block text-sm font-semibold">ภาคเรียน</label><select id={`${formId}-term`} name="termId" required className={selectStyles}>{availableTerms.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}</select></div>
          <div><label htmlFor={`${formId}-classroom`} className="mb-2 block text-sm font-semibold">ห้องเรียน</label><select id={`${formId}-classroom`} name="classroomId" required className={selectStyles}>{classrooms.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
          <div><label htmlFor={`${formId}-subject`} className="mb-2 block text-sm font-semibold">รายวิชา</label><select id={`${formId}-subject`} name="subjectId" required className={selectStyles}>{subjects.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></div>
        </div>
        {error ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p> : null}
        <div className="mt-5 flex justify-between gap-4"><p className="text-xs text-[#6B7280]">ห้องเรียนและวิชาเดียวกันในคนละห้องจะถูกเก็บเป็นคนละงานสอน</p><button type="submit" disabled={pending || availableTerms.length === 0} className="min-h-11 shrink-0 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-60">{pending ? "กำลังเพิ่ม…" : "เพิ่มงานสอน"}</button></div>
      </form>

      <section className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm" aria-labelledby="assignment-list-heading">
        <div className="border-b border-[#E5E7EB] px-5 py-4"><h2 id="assignment-list-heading" className="font-bold">งานสอนปัจจุบัน</h2></div>
        {assignments.length === 0 ? <EmptyCollectionState title="ยังไม่มีงานสอน" description="เลือกปี ภาคเรียน ห้องเรียน และรายวิชาเพื่อเพิ่มงานสอนแรก" /> : <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><caption className="sr-only">รายการงานสอนแยกตามห้องเรียน รายวิชา ภาคเรียน และปีการศึกษา</caption><thead className="bg-slate-50 text-[#6B7280]"><tr><th className="px-5 py-3.5" scope="col">ห้องเรียน</th><th className="px-5 py-3.5" scope="col">รายวิชา</th><th className="px-5 py-3.5" scope="col">ภาคเรียน</th><th className="px-5 py-3.5" scope="col">ปีการศึกษา</th></tr></thead><tbody className="divide-y divide-slate-100">{assignments.map((item) => <tr key={item.id}><th scope="row" className="px-5 py-4 font-semibold">{item.classroomName}</th><td className="px-5 py-4"><span className="font-mono text-xs text-[#6B7280]">{item.subjectCode}</span> · {item.subjectName}</td><td className="px-5 py-4">{item.termName}</td><td className="px-5 py-4">{item.academicYearName}</td></tr>)}</tbody></table></div>}
        <p className="border-t border-[#E5E7EB] px-5 py-3 text-xs text-[#6B7280]">การลบงานสอนจะเพิ่มภายหลังเมื่อมีการตรวจสอบตารางสอนและข้อมูลชั้นเรียนที่อ้างอิงอย่างปลอดภัย</p>
      </section>
    </div>
  );
}
