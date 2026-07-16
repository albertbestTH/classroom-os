"use client";

import type { AttendanceStatus, SessionAttendanceResult } from "@classroom-os/types";
import { useMemo, useState } from "react";

import { requestApi, thaiApiError } from "@/lib/client-api";

const statuses: Array<{ value: AttendanceStatus; label: string; style: string }> = [
  { value: "present", label: "มา", style: "peer-checked:border-emerald-600 peer-checked:bg-emerald-50 peer-checked:text-emerald-800" },
  { value: "late", label: "สาย", style: "peer-checked:border-amber-600 peer-checked:bg-amber-50 peer-checked:text-amber-800" },
  { value: "absent", label: "ขาด", style: "peer-checked:border-red-600 peer-checked:bg-red-50 peer-checked:text-red-800" },
  { value: "leave", label: "ลา", style: "peer-checked:border-blue-600 peer-checked:bg-blue-50 peer-checked:text-blue-800" },
];

export function AttendanceEditor({ initial }: { initial: SessionAttendanceResult }) {
  const readOnly = initial.status === "completed" || initial.status === "cancelled";
  const baseline = useMemo(() => Object.fromEntries(initial.students.map((item) => [item.studentId, item.status])), [initial.students]);
  const [values, setValues] = useState<Record<string, AttendanceStatus | null>>(baseline);
  const [saved, setSaved] = useState(baseline);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  function markAllPresent() {
    if (readOnly) return;
    setValues(Object.fromEntries(initial.students.map((item) => [item.studentId, "present"])));
    setFeedback(null);
  }

  async function save() {
    const records = initial.students.flatMap((student) => values[student.studentId] ? [{ studentId: student.studentId, status: values[student.studentId]! }] : []);
    if (records.length === 0) { setFeedback({ type: "error", text: "เลือกสถานะอย่างน้อย 1 คนก่อนบันทึก" }); return; }
    setPending(true); setFeedback(null);
    try {
      await requestApi(`/api/sessions/${initial.sessionId}/attendance`, { method: "PUT", body: { classroomId: initial.classroomId, records } });
      setSaved({ ...values });
      setFeedback({ type: "success", text: `บันทึกการเข้าเรียน ${records.length} คนแล้ว` });
    } catch (saveError) { setFeedback({ type: "error", text: thaiApiError(saveError) }); }
    finally { setPending(false); }
  }

  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p className={`text-sm font-semibold ${dirty ? "text-amber-700" : "text-[#6B7280]"}`} aria-live="polite">{readOnly ? "คาบเรียนจบแล้ว · อ่านอย่างเดียว" : dirty ? "มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก" : "บันทึกข้อมูลล่าสุดแล้ว"}</p>
        {!readOnly ? <div className="flex gap-3"><button type="button" onClick={markAllPresent} className="min-h-11 rounded-xl border border-emerald-300 px-4 text-sm font-bold text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">ทำเครื่องหมายว่ามาทั้งหมด</button><button type="button" onClick={save} disabled={pending || !dirty} className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-50">{pending ? "กำลังบันทึก…" : "บันทึก"}</button></div> : null}
      </div>
      {feedback ? <p className={`rounded-xl px-4 py-3 text-sm ${feedback.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`} role={feedback.type === "error" ? "alert" : "status"}>{feedback.text}</p> : null}
      {initial.students.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><p className="font-semibold">ยังไม่มีนักเรียนในห้องนี้</p><p className="mt-1 text-sm text-[#6B7280]">เพิ่มการลงทะเบียนนักเรียนในภาคเรียนนี้ก่อนเช็กชื่อ</p></div> : <ul className="space-y-3">{initial.students.map((student) => <li key={student.studentId} className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-center"><div className="min-w-0 flex-1"><p className="font-semibold">{student.firstName} {student.lastName}{student.preferredName ? ` (${student.preferredName})` : ""}</p><p className="mt-1 font-mono text-xs text-[#6B7280]">{student.studentNumber}</p></div><fieldset disabled={readOnly} className="grid grid-cols-4 gap-2"><legend className="sr-only">สถานะของ {student.firstName} {student.lastName}</legend>{statuses.map((status) => <label key={status.value} className="cursor-pointer"><input type="radio" className="peer sr-only" name={`status-${student.studentId}`} value={status.value} checked={values[student.studentId] === status.value} onChange={() => { setValues((current) => ({ ...current, [student.studentId]: status.value })); setFeedback(null); }} /><span className={`inline-flex min-h-11 min-w-14 items-center justify-center rounded-xl border border-slate-200 px-3 text-sm font-semibold ${status.style} peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600 peer-focus-visible:ring-offset-2`}>{status.label}</span></label>)}</fieldset></div></li>)}</ul>}
    </div>
  );
}
