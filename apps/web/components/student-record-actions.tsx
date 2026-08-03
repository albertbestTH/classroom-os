"use client";

import type { ApiErrorResponse, StudentResult } from "@classroom-os/types";
import { CheckCircle2, Pencil, Trash2, XCircle } from "lucide-react";
import { useState, type FormEvent } from "react";

type ClassroomContext = {
  classroomId: string;
  termId: string;
  label: string;
};

type ActionResult = {
  kind: "success" | "error";
  title: string;
  message: string;
};

async function readError(response: Response, fallback: string): Promise<string> {
  const payload = await response.json().catch(() => null) as ApiErrorResponse | null;
  return payload && "error" in payload ? payload.error.message : `${fallback} (${response.status})`;
}

export function StudentRecordActions({
  student,
  classroom,
  onChanged,
}: {
  student: StudentResult;
  classroom: ClassroomContext | null;
  onChanged: () => void;
}) {
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [refreshAfterResult, setRefreshAfterResult] = useState(false);
  const [form, setForm] = useState({
    studentNumber: student.studentNumber,
    firstName: student.firstName,
    lastName: student.lastName,
    preferredName: student.preferredName ?? "",
    rollNumber: student.rollNumber?.toString() ?? "",
  });

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const rollNumber = form.rollNumber ? Number(form.rollNumber) : undefined;
    if (rollNumber !== undefined && (!Number.isInteger(rollNumber) || rollNumber <= 0)) {
      setResult({ kind: "error", title: "บันทึกไม่สำเร็จ", message: "เลขที่ต้องเป็นจำนวนเต็มมากกว่า 0" });
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNumber: form.studentNumber,
          firstName: form.firstName,
          lastName: form.lastName,
          preferredName: form.preferredName.trim() || null,
          ...(classroom && rollNumber !== undefined
            ? {
                classroomId: classroom.classroomId,
                termId: classroom.termId,
                rollNumber,
              }
            : {}),
        }),
      });
      if (!response.ok) throw new Error(await readError(response, "แก้ไขข้อมูลนักเรียนไม่สำเร็จ"));
      setMode(null);
      setResult({ kind: "success", title: "บันทึกสำเร็จ", message: "แก้ไขข้อมูลนักเรียนเรียบร้อยแล้ว" });
      setRefreshAfterResult(true);
    } catch (error) {
      setResult({
        kind: "error",
        title: "บันทึกไม่สำเร็จ",
        message: error instanceof Error ? error.message : "แก้ไขข้อมูลนักเรียนไม่สำเร็จ",
      });
    } finally {
      setBusy(false);
    }
  }

  async function deactivate() {
    setBusy(true);
    try {
      const response = await fetch(`/api/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      if (!response.ok) throw new Error(await readError(response, "ลบนักเรียนไม่สำเร็จ"));
      setMode(null);
      setResult({
        kind: "success",
        title: "ลบออกจากรายชื่อแล้ว",
        message: "ข้อมูลประวัติการเข้าเรียนและคะแนนย้อนหลังยังคงถูกเก็บไว้อย่างปลอดภัย",
      });
      setRefreshAfterResult(true);
    } catch (error) {
      setResult({
        kind: "error",
        title: "ลบนักเรียนไม่สำเร็จ",
        message: error instanceof Error ? error.message : "ลบนักเรียนไม่สำเร็จ",
      });
    } finally {
      setBusy(false);
    }
  }

  return <>
    <div className="flex items-center gap-1">
      <button type="button" aria-label={`แก้ไข ${student.firstName} ${student.lastName}`} onClick={() => setMode("edit")} className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
        <Pencil aria-hidden="true" size={18} strokeWidth={1.9} />
      </button>
      <button type="button" aria-label={`ลบ ${student.firstName} ${student.lastName}`} onClick={() => setMode("delete")} className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600">
        <Trash2 aria-hidden="true" size={18} strokeWidth={1.9} />
      </button>
    </div>

    {mode === "edit" ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-labelledby={`edit-student-${student.id}`}>
      <form onSubmit={save} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 id={`edit-student-${student.id}`} className="text-xl font-bold text-slate-950">แก้ไขข้อมูลนักเรียน</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {classroom ? <label className="text-sm font-semibold text-slate-800">เลขที่
            <input type="number" min="1" step="1" required value={form.rollNumber} onChange={(event) => setForm({ ...form, rollNumber: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" />
          </label> : null}
          <label className="text-sm font-semibold text-slate-800">รหัสนักเรียน
            <input required value={form.studentNumber} onChange={(event) => setForm({ ...form, studentNumber: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" />
          </label>
          <label className="text-sm font-semibold text-slate-800">ชื่อ
            <input required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" />
          </label>
          <label className="text-sm font-semibold text-slate-800">นามสกุล
            <input required value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" />
          </label>
          <label className="text-sm font-semibold text-slate-800">ชื่อเล่น (ถ้ามี)
            <input value={form.preferredName} onChange={(event) => setForm({ ...form, preferredName: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" />
          </label>
        </div>
        {!classroom ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">เลือกชั้นเรียนและห้องเรียนก่อน หากต้องการแก้ไขเลขที่</p> : null}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={() => setMode(null)} className="min-h-11 rounded-xl border border-slate-300 px-5 font-semibold disabled:opacity-50">ยกเลิก</button>
          <button type="submit" disabled={busy} className="min-h-11 rounded-xl bg-blue-600 px-5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{busy ? "กำลังบันทึก…" : "บันทึกการแก้ไข"}</button>
        </div>
      </form>
    </div> : null}

    {mode === "delete" ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="alertdialog" aria-modal="true" aria-labelledby={`delete-student-${student.id}`} aria-describedby={`delete-student-description-${student.id}`}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 id={`delete-student-${student.id}`} className="text-xl font-bold text-slate-950">ลบนักเรียนออกจากรายชื่อ?</h2>
        <p id={`delete-student-description-${student.id}`} className="mt-2 text-sm leading-6 text-slate-600">{student.firstName} {student.lastName} จะไม่แสดงในรายชื่อที่ใช้งาน แต่ประวัติการเข้าเรียนและคะแนนย้อนหลังจะไม่ถูกลบ</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={() => setMode(null)} className="min-h-11 rounded-xl border border-slate-300 px-5 font-semibold disabled:opacity-50">ยกเลิก</button>
          <button type="button" disabled={busy} onClick={() => void deactivate()} className="min-h-11 rounded-xl bg-red-600 px-5 font-semibold text-white hover:bg-red-700 disabled:opacity-50">{busy ? "กำลังลบ…" : "ยืนยันการลบ"}</button>
        </div>
      </div>
    </div> : null}

    {result ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-labelledby={`student-action-result-${student.id}`}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">
        {result.kind === "success"
          ? <CheckCircle2 aria-hidden="true" className="mx-auto h-14 w-14 text-emerald-600" strokeWidth={1.9} />
          : <XCircle aria-hidden="true" className="mx-auto h-14 w-14 text-red-600" strokeWidth={1.9} />}
        <h2 id={`student-action-result-${student.id}`} className="mt-4 text-xl font-bold text-slate-950">{result.title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{result.message}</p>
        <button type="button" onClick={() => {
          setResult(null);
          if (refreshAfterResult) {
            setRefreshAfterResult(false);
            onChanged();
          }
        }} className="mt-6 min-h-11 w-full rounded-xl bg-blue-600 px-5 font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">ตกลง</button>
      </div>
    </div> : null}
  </>;
}
