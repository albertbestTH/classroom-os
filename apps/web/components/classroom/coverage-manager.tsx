"use client";

import type { TimetableCoverageResult, TimetableEntryResult, UserRole } from "@classroom-os/types";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { requestApi, thaiApiError } from "@/lib/client-api";

const control = "min-h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";

export function CoverageManager({ entries, coverages, role, teacherId }: {
  entries: TimetableEntryResult[];
  coverages: TimetableCoverageResult[];
  role: UserRole;
  teacherId: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const teachers = useMemo(() => [...new Map(entries.map((item) => [item.teacherId, {
    id: item.teacherId, name: item.teacherName,
  }])).values()].filter((item) => role !== "TEACHER" || item.id !== teacherId), [entries, role, teacherId]);
  const sourceEntries = role === "TEACHER"
    ? entries.filter((entry) => entry.teacherId === teacherId)
    : entries;

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await requestApi("/api/timetable/coverage", { body: {
        timetableEntryId: form.get("timetableEntryId"),
        substituteTeacherId: form.get("substituteTeacherId"),
        localDate: form.get("localDate"),
        kind: form.get("kind"),
        reciprocalEntryId: form.get("reciprocalEntryId") || null,
        reason: form.get("reason") || null,
      } });
      formElement.reset(); router.refresh();
    } catch (cause) { setError(thaiApiError(cause)); } finally { setPending(false); }
  }

  async function resolve(id: string, status: "active" | "declined" | "cancelled") {
    setPending(true); setError(null);
    try { await requestApi(`/api/timetable/coverage/${id}`, { method: "PATCH", body: { status } }); router.refresh(); }
    catch (cause) { setError(thaiApiError(cause)); } finally { setPending(false); }
  }

  return <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm" aria-labelledby="coverage-heading">
    <h2 id="coverage-heading" className="text-lg font-bold">ฝากคาบและสลับคาบ</h2>
    <p className="mt-1 text-sm text-[#6B7280]">ผู้สอนแทนใช้รายชื่อและข้อมูลของห้องเดิม ข้อมูลเช็กชื่อและคะแนนไม่ย้ายไปยังชั้นของผู้สอนแทน</p>
    <form onSubmit={create} className="mt-5 grid gap-4 lg:grid-cols-3">
      <label className="text-sm font-semibold">คาบต้นทาง<select required name="timetableEntryId" defaultValue="" className={`${control} mt-2`}><option value="" disabled>เลือกคาบ</option>{sourceEntries.map((entry) => <option key={entry.id} value={entry.id}>{entry.teacherName} · {entry.classroomName} · {entry.subjectName}</option>)}</select></label>
      <label className="text-sm font-semibold">ครูผู้สอนแทน<select required name="substituteTeacherId" defaultValue="" className={`${control} mt-2`}><option value="" disabled>เลือกครู</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label>
      <label className="text-sm font-semibold">วันที่<input required name="localDate" type="date" className={`${control} mt-2`} /></label>
      <label className="text-sm font-semibold">รูปแบบ<select name="kind" className={`${control} mt-2`}><option value="cover">ฝากสอนแทน</option><option value="swap">สลับคาบ</option></select></label>
      <label className="text-sm font-semibold">คาบแลกกลับ (เฉพาะสลับคาบ)<select name="reciprocalEntryId" defaultValue="" className={`${control} mt-2`}><option value="">— ไม่ใช้ —</option>{entries.map((entry) => <option key={entry.id} value={entry.id}>{entry.teacherName} · {entry.classroomName} · {entry.subjectName}</option>)}</select></label>
      <label className="text-sm font-semibold">เหตุผล<input name="reason" maxLength={500} className={`${control} mt-2`} /></label>
      <button type="submit" disabled={pending} className="min-h-11 rounded-xl bg-blue-600 px-5 font-bold text-white disabled:opacity-60 lg:col-span-3">{pending ? "กำลังส่ง…" : "ส่งคำขอ"}</button>
    </form>
    {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
    <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><caption className="sr-only">รายการฝากและสลับคาบ</caption><thead className="bg-slate-50 text-[#6B7280]"><tr><th scope="col" className="px-3 py-3">วันที่</th><th scope="col" className="px-3 py-3">เจ้าของคาบ</th><th scope="col" className="px-3 py-3">ผู้สอนแทน</th><th scope="col" className="px-3 py-3">ประเภท</th><th scope="col" className="px-3 py-3">สถานะ</th><th scope="col" className="px-3 py-3"><span className="sr-only">ดำเนินการ</span></th></tr></thead><tbody className="divide-y">{coverages.map((item) => <tr key={item.id}><td className="px-3 py-3">{item.localDate}</td><td className="px-3 py-3">{item.originalTeacherName}</td><td className="px-3 py-3">{item.substituteTeacherName}</td><td className="px-3 py-3">{item.kind === "swap" ? "สลับคาบ" : "ฝากสอน"}</td><td className="px-3 py-3">{item.status}</td><td className="px-3 py-3 text-right">{item.status === "pending" && (role !== "TEACHER" || teacherId === item.substituteTeacherId) ? <><button type="button" disabled={pending} onClick={() => void resolve(item.id, "active")} className="min-h-11 rounded-lg px-3 font-semibold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">ยอมรับ</button><button type="button" disabled={pending} onClick={() => void resolve(item.id, "declined")} className="min-h-11 rounded-lg px-3 font-semibold text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600">ปฏิเสธ</button></> : null}{item.status === "pending" && teacherId === item.originalTeacherId ? <button type="button" disabled={pending} onClick={() => void resolve(item.id, "cancelled")} className="min-h-11 rounded-lg px-3 font-semibold text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600">ยกเลิก</button> : null}</td></tr>)}</tbody></table>{coverages.length === 0 ? <p className="py-8 text-center text-sm text-[#6B7280]">ยังไม่มีคำขอฝากหรือสลับคาบ</p> : null}</div>
  </section>;
}
