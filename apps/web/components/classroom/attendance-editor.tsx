"use client";

import type {
  AttendanceStatus,
  SessionAttendanceResult,
  SessionAttendanceStudentResult,
} from "@classroom-os/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { requestApi, thaiApiError } from "@/lib/client-api";

const statuses: Array<{ value: AttendanceStatus; label: string; style: string }> = [
  { value: "present", label: "มา", style: "peer-checked:border-emerald-600 peer-checked:bg-emerald-50 peer-checked:text-emerald-800" },
  { value: "late", label: "สาย", style: "peer-checked:border-amber-600 peer-checked:bg-amber-50 peer-checked:text-amber-800" },
  { value: "absent", label: "ขาด", style: "peer-checked:border-red-600 peer-checked:bg-red-50 peer-checked:text-red-800" },
  { value: "leave", label: "ลา", style: "peer-checked:border-blue-600 peer-checked:bg-blue-50 peer-checked:text-blue-800" },
];

type CorrectionDraft = {
  student: SessionAttendanceStudentResult;
  status: AttendanceStatus;
  note: string;
  reason: string;
};

export function AttendanceEditor({
  initial,
  canCorrect = false,
}: {
  initial: SessionAttendanceResult;
  canCorrect?: boolean;
}) {
  const router = useRouter();
  const readOnly = initial.status === "completed" || initial.status === "cancelled";
  const baseline = useMemo(
    () => Object.fromEntries(initial.students.map((item) => [item.studentId, item.status])),
    [initial.students],
  );
  const storageKey = `classroom-os:attendance:${initial.sessionId}`;
  const [values, setValues] = useState<Record<string, AttendanceStatus | null>>(baseline);
  const [saved, setSaved] = useState(baseline);
  const [pending, setPending] = useState(false);
  const [correction, setCorrection] = useState<CorrectionDraft | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  useEffect(() => {
    if (readOnly) return;
    const stored = window.sessionStorage.getItem(storageKey);
    if (!stored) return;
    try {
      const restored = JSON.parse(stored) as Record<string, AttendanceStatus | null>;
      const timer = window.setTimeout(
        () => setValues((current) => ({ ...current, ...restored })),
        0,
      );
      return () => window.clearTimeout(timer);
    } catch {
      window.sessionStorage.removeItem(storageKey);
    }
  }, [readOnly, storageKey]);

  useEffect(() => {
    if (readOnly) return;
    if (dirty) window.sessionStorage.setItem(storageKey, JSON.stringify(values));
    else window.sessionStorage.removeItem(storageKey);
  }, [dirty, readOnly, storageKey, values]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function markAllPresent() {
    if (readOnly) return;
    setValues(Object.fromEntries(initial.students.map((item) => [item.studentId, "present"])));
    setFeedback(null);
  }

  async function save() {
    const records = initial.students.flatMap((student) =>
      values[student.studentId]
        ? [{ studentId: student.studentId, status: values[student.studentId]! }]
        : [],
    );
    if (records.length === 0) {
      setFeedback({ type: "error", text: "เลือกสถานะอย่างน้อย 1 คนก่อนบันทึก" });
      return;
    }
    setPending(true);
    setFeedback(null);
    try {
      await requestApi(`/api/sessions/${initial.sessionId}/attendance`, {
        method: "PUT",
        body: { classroomId: initial.classroomId, records },
      });
      setSaved({ ...values });
      setFeedback({ type: "success", text: `บันทึกการเข้าเรียน ${records.length} คนแล้ว` });
      window.sessionStorage.removeItem(storageKey);
    } catch (saveError) {
      setFeedback({ type: "error", text: `${thaiApiError(saveError)} ลองใหม่ได้โดยข้อมูลที่เลือกไว้จะไม่หาย` });
    } finally {
      setPending(false);
    }
  }

  async function submitCorrection() {
    if (!correction?.student.recordUpdatedAt || !correction.reason.trim()) return;
    setPending(true);
    setFeedback(null);
    try {
      await requestApi(`/api/sessions/${initial.sessionId}/attendance/corrections`, {
        body: {
          classroomId: initial.classroomId,
          studentId: correction.student.studentId,
          status: correction.status,
          note: correction.note.trim() || null,
          reason: correction.reason,
          expectedRecordUpdatedAt: correction.student.recordUpdatedAt,
        },
      });
      setCorrection(null);
      setFeedback({ type: "success", text: "แก้ไขข้อมูลและบันทึกประวัติแล้ว" });
      router.refresh();
    } catch (correctionError) {
      setFeedback({ type: "error", text: thaiApiError(correctionError) });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p className={`text-sm font-semibold ${dirty ? "text-amber-700" : "text-[#6B7280]"}`} aria-live="polite">
          {initial.status === "cancelled" ? "คาบนี้ถูกยกเลิกและอ่านอย่างเดียว" : readOnly ? (canCorrect ? "คาบจบแล้ว · ผู้ดูแลแก้ไขได้พร้อมเหตุผลและประวัติ" : "คาบจบแล้ว · อ่านอย่างเดียว") : dirty ? "มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก" : "บันทึกข้อมูลล่าสุดแล้ว"}
        </p>
        {!readOnly ? <div className="flex gap-3"><button type="button" onClick={markAllPresent} className="min-h-11 rounded-xl border border-emerald-300 px-4 text-sm font-bold text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">ทำเครื่องหมายว่ามาทั้งหมด</button><button type="button" onClick={save} disabled={pending || !dirty} className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-50">{pending ? "กำลังบันทึก…" : "บันทึก"}</button></div> : null}
      </div>
      {feedback ? <p className={`rounded-xl px-4 py-3 text-sm ${feedback.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`} role={feedback.type === "error" ? "alert" : "status"}>{feedback.text}</p> : null}
      {initial.students.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><p className="font-semibold">ยังไม่มีนักเรียนในห้องนี้</p><p className="mt-1 text-sm text-[#6B7280]">เพิ่มการลงทะเบียนนักเรียนในภาคเรียนนี้ก่อนเช็กชื่อ</p></div> : <ul className="space-y-3">{initial.students.map((student) => <li key={student.studentId} className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-center"><div className="min-w-0 flex-1"><p className="font-semibold">{student.firstName} {student.lastName}{student.preferredName ? ` (${student.preferredName})` : ""}</p><p className="mt-1 font-mono text-xs text-[#6B7280]">{student.studentNumber}</p></div><fieldset disabled={readOnly} className="grid grid-cols-4 gap-2"><legend className="sr-only">สถานะของ {student.firstName} {student.lastName}</legend>{statuses.map((status) => <label key={status.value} className="cursor-pointer"><input type="radio" className="peer sr-only" name={`status-${student.studentId}`} value={status.value} checked={values[student.studentId] === status.value} onChange={() => { setValues((current) => ({ ...current, [student.studentId]: status.value })); setFeedback(null); }} /><span className={`inline-flex min-h-11 min-w-14 items-center justify-center rounded-xl border border-slate-200 px-3 text-sm font-semibold ${status.style} peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600 peer-focus-visible:ring-offset-2`}>{status.label}</span></label>)}</fieldset>{canCorrect && initial.status === "completed" && student.status && student.recordUpdatedAt ? <button type="button" onClick={() => setCorrection({ student, status: student.status!, note: student.note ?? "", reason: "" })} className="min-h-11 rounded-xl border border-blue-300 px-4 text-sm font-bold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">แก้ไข</button> : null}</div>{student.corrections.length > 0 ? <details className="mt-4 border-t border-slate-100 pt-3"><summary className="cursor-pointer text-sm font-semibold text-blue-700">ประวัติการแก้ไข {student.corrections.length} ครั้ง</summary><ol className="mt-3 space-y-2">{student.corrections.map((item) => <li key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm"><p><strong>{statusLabelsForCorrection(item.beforeStatus)}</strong> → <strong>{statusLabelsForCorrection(item.afterStatus)}</strong> · {item.actorName ?? "ผู้ใช้งานที่ถูกลบ"}</p><p className="mt-1 text-slate-600">เหตุผล: {item.reason}</p><time className="mt-1 block text-xs text-slate-500" dateTime={item.createdAt}>{new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</time></li>)}</ol></details> : null}</li>)}</ul>}

      {correction ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="correction-title"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"><h2 id="correction-title" className="text-xl font-bold">ยืนยันแก้ไขการเข้าเรียน</h2><p className="mt-2 text-sm text-slate-600">{correction.student.firstName} {correction.student.lastName} · ค่าก่อนแก้ไขจะถูกเก็บในประวัติถาวร</p><label className="mt-5 block text-sm font-semibold">สถานะใหม่<select value={correction.status} onChange={(event) => setCorrection({ ...correction, status: event.target.value as AttendanceStatus })} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label><label className="mt-4 block text-sm font-semibold">หมายเหตุ<input value={correction.note} onChange={(event) => setCorrection({ ...correction, note: event.target.value })} maxLength={500} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" /></label><label className="mt-4 block text-sm font-semibold">เหตุผลที่แก้ไข <span className="text-red-700">*</span><textarea required value={correction.reason} onChange={(event) => setCorrection({ ...correction, reason: event.target.value })} maxLength={500} rows={3} className="mt-2 w-full rounded-xl border border-slate-300 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" /></label><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setCorrection(null)} disabled={pending} className="min-h-11 rounded-xl px-4 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">ยกเลิก</button><button type="button" onClick={submitCorrection} disabled={pending || !correction.reason.trim()} className="min-h-11 rounded-xl bg-blue-600 px-5 font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-50">{pending ? "กำลังบันทึก…" : "ยืนยันและบันทึกประวัติ"}</button></div></div></div> : null}
    </div>
  );
}

function statusLabelsForCorrection(status: AttendanceStatus) {
  return statuses.find((item) => item.value === status)?.label ?? status;
}
