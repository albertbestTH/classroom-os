"use client";

import type { TeachingAssignmentResult, TimetableEntryResult, UserRole } from "@classroom-os/types";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { requestApi, timetableThaiApiError } from "@/lib/client-api";

const days = [
  { value: 1, label: "วันจันทร์" }, { value: 2, label: "วันอังคาร" },
  { value: 3, label: "วันพุธ" }, { value: 4, label: "วันพฤหัสบดี" },
  { value: 5, label: "วันศุกร์" },
];
const control = "min-h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";
type TimetableForm = { teachingAssignmentId: string; weekday: number; startTime: string; endTime: string; room: string };
const emptyForm = (): TimetableForm => ({ teachingAssignmentId: "", weekday: 1, startTime: "08:00", endTime: "08:50", room: "" });
const sortEntries = (items: TimetableEntryResult[]) => [...items].sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime) || a.id.localeCompare(b.id));

export function TimetableManager({ entries, assignments, role }: { entries: TimetableEntryResult[]; assignments: TeachingAssignmentResult[]; role: UserRole }) {
  const router = useRouter();
  const id = useId();
  const submitting = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const formTitleRef = useRef<HTMLHeadingElement>(null);
  const revealEditForm = useRef(false);
  const [teacher, setTeacher] = useState("");
  const [classroom, setClassroom] = useState("");
  const [subject, setSubject] = useState("");
  const [localEntries, setLocalEntries] = useState<TimetableEntryResult[]>([]);
  const [editing, setEditing] = useState<TimetableEntryResult | null>(null);
  const [form, setForm] = useState<TimetableForm>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(null), 4_000);
    return () => window.clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    if (!showForm || !revealEditForm.current) return;
    revealEditForm.current = false;

    const frame = window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      formRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      formTitleRef.current?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [showForm, editing]);

  const displayEntries = useMemo(() => sortEntries([...new Map([...entries, ...localEntries].map((entry) => [entry.id, entry])).values()]), [entries, localEntries]);
  const filtered = useMemo(() => displayEntries.filter((entry) =>
    (!teacher || entry.teacherId === teacher) && (!classroom || entry.classroomId === classroom) && (!subject || entry.subjectId === subject)),
  [displayEntries, teacher, classroom, subject]);
  const unique = <T extends { id: string }>(items: T[]) => [...new Map(items.map((item) => [item.id, item])).values()];
  const teachers = unique(assignments.map((item) => ({ id: item.teacherId, name: item.teacherName })));
  const classrooms = unique(assignments.map((item) => ({ id: item.classroomId, name: item.classroomName })));
  const subjects = unique(assignments.map((item) => ({ id: item.subjectId, name: `${item.subjectCode} · ${item.subjectName}` })));

  function closeForm() { setShowForm(false); setEditing(null); setForm(emptyForm()); setError(null); }
  function openCreate() { setEditing(null); setForm(emptyForm()); setError(null); setSuccess(null); setShowForm(true); }
  function openEdit(entry: TimetableEntryResult) {
    revealEditForm.current = true;
    setEditing(entry);
    setForm({ teachingAssignmentId: entry.teachingAssignmentId, weekday: entry.weekday, startTime: entry.startTime, endTime: entry.endTime, room: entry.room ?? "" });
    setError(null); setSuccess(null); setShowForm(true);
  }
  function updateForm<K extends keyof TimetableForm>(key: K, value: TimetableForm[K]) { setForm((current) => ({ ...current, [key]: value })); }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || pending) return;
    submitting.current = true; setPending(true); setError(null); setSuccess(null);
    const operation = editing ? "update" : "create";
    try {
      const saved = editing
        ? await requestApi<TimetableEntryResult>(`/api/timetable/${editing.id}`, { method: "PATCH", body: { weekday: form.weekday, startTime: form.startTime, endTime: form.endTime, room: form.room || null } })
        : await requestApi<TimetableEntryResult>("/api/timetable", { body: { teachingAssignmentId: form.teachingAssignmentId, weekday: form.weekday, startTime: form.startTime, endTime: form.endTime, room: form.room || null } });
      setLocalEntries((current) => [...current.filter((entry) => entry.id !== saved.id), saved]);
      setSuccess(editing ? "บันทึกการแก้ไขคาบเรียนแล้ว" : "เพิ่มคาบเรียนแล้ว");
      setShowForm(false); setEditing(null); setForm(emptyForm());
      router.refresh();
    } catch (submitError) {
      setError(timetableThaiApiError(submitError, operation));
    } finally {
      submitting.current = false; setPending(false);
    }
  }

  return <div className="mt-8 space-y-6">
    <div className="flex flex-col gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm lg:flex-row lg:items-end">
      {role !== "TEACHER" ? <>
        <label className="block flex-1 text-sm font-semibold">ครู<select value={teacher} onChange={(event) => setTeacher(event.target.value)} className={`${control} mt-2`}><option value="">ครูทุกคน</option>{teachers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="block flex-1 text-sm font-semibold">ห้องเรียน<select value={classroom} onChange={(event) => setClassroom(event.target.value)} className={`${control} mt-2`}><option value="">ทุกห้อง</option>{classrooms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="block flex-1 text-sm font-semibold">รายวิชา<select value={subject} onChange={(event) => setSubject(event.target.value)} className={`${control} mt-2`}><option value="">ทุกวิชา</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </> : <p className="flex-1 text-sm text-[#6B7280]">แสดงเฉพาะงานสอนที่มอบหมายให้คุณในภาคเรียนปัจจุบัน</p>}
      <button type="button" onClick={openCreate} className="min-h-11 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">+ เพิ่มคาบเรียน</button>
    </div>

    {success ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800" role="status">{success}</p> : null}
    {showForm ? <form ref={formRef} onSubmit={submit} className="scroll-mt-6 rounded-2xl border border-blue-200 bg-blue-50/40 p-5 lg:scroll-mt-8" aria-labelledby={`${id}-form-title`}>
      <div className="flex items-center justify-between gap-4"><div><h2 ref={formTitleRef} id={`${id}-form-title`} tabIndex={-1} className="text-lg font-bold outline-none">{editing ? "แก้ไขคาบเรียน" : "เพิ่มคาบเรียน"}</h2>{editing ? <p className="mt-1 text-sm text-slate-600">กำลังแก้ไข {editing.subjectName} · {editing.classroomName}</p> : null}</div><button type="button" onClick={closeForm} disabled={pending} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-60">{editing ? "ยกเลิกการแก้ไข" : "ยกเลิก"}</button></div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="text-sm font-semibold xl:col-span-2">งานสอน<select aria-label="งานสอน" required disabled={Boolean(editing)} value={form.teachingAssignmentId} onChange={(event) => updateForm("teachingAssignmentId", event.target.value)} className={`${control} mt-2 disabled:bg-slate-100`}><option value="" disabled>เลือกห้องเรียนและวิชา</option>{assignments.map((item) => <option key={item.id} value={item.id}>{item.teacherName} · {item.classroomName} · {item.subjectName}</option>)}</select></label>
        <label className="text-sm font-semibold">วัน<select aria-label="วัน" value={form.weekday} onChange={(event) => updateForm("weekday", Number(event.target.value))} className={`${control} mt-2`}>{days.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}</select></label>
        <label className="text-sm font-semibold">เวลาเริ่ม<input aria-label="เวลาเริ่ม" type="time" required value={form.startTime} onChange={(event) => updateForm("startTime", event.target.value)} className={`${control} mt-2`} /></label>
        <label className="text-sm font-semibold">เวลาสิ้นสุด<input aria-label="เวลาสิ้นสุด" type="time" required value={form.endTime} onChange={(event) => updateForm("endTime", event.target.value)} className={`${control} mt-2`} /></label>
        <label className="text-sm font-semibold">ห้อง<input aria-label="ห้อง" value={form.room} onChange={(event) => updateForm("room", event.target.value)} className={`${control} mt-2`} /></label>
      </div>
      {error ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p> : null}
      <div className="mt-5 flex justify-end"><button type="submit" disabled={pending} className="min-h-11 rounded-xl bg-blue-600 px-6 py-2 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-60">{pending ? "กำลังบันทึก…" : editing ? "บันทึกการแก้ไข" : "บันทึกคาบเรียน"}</button></div>
    </form> : null}

    <section className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm" aria-labelledby="weekly-timetable-heading">
      <div className="border-b border-[#E5E7EB] px-5 py-4"><h2 id="weekly-timetable-heading" className="font-bold">ตารางประจำสัปดาห์</h2><p className="mt-1 text-sm text-[#6B7280]">เลื่อนในแนวนอนเพื่อดูวันอื่นบนหน้าจอขนาดเล็ก</p></div>
      <div className="overflow-x-auto p-4 sm:p-5"><div className="grid min-w-[1000px] grid-cols-5 gap-3">{days.map((day) => {
        const dayEntries = filtered.filter((entry) => entry.weekday === day.value);
        return <section key={day.value} aria-labelledby={`${id}-day-${day.value}`} className="rounded-xl bg-slate-50 p-3"><h3 id={`${id}-day-${day.value}`} className="text-center font-bold">{day.label}</h3><div className="mt-3 space-y-3">
          {dayEntries.map((entry) => <article key={entry.id} aria-current={editing?.id === entry.id ? "true" : undefined} className={`rounded-xl border bg-white p-4 shadow-sm ${editing?.id === entry.id ? "border-blue-600 ring-2 ring-blue-100" : "border-blue-100"}`}><p className="text-sm font-bold text-blue-800">{entry.startTime}–{entry.endTime}</p><p className="mt-2 font-semibold">{entry.subjectName}</p><p className="mt-1 text-sm text-[#6B7280]">{entry.classroomName}</p><p className="mt-1 text-xs text-[#6B7280]">{entry.teacherName} · ห้อง {entry.room ?? "—"}</p><p className="mt-1 text-xs text-[#6B7280]">{entry.termName} · {entry.academicYearName}</p><button type="button" onClick={() => openEdit(entry)} disabled={pending} className="mt-3 min-h-11 rounded-lg px-3 text-sm font-semibold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-60">แก้ไข</button></article>)}
          {dayEntries.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 px-3 py-8 text-center text-sm text-slate-500">ไม่มีคาบเรียน</p> : null}
        </div></section>;
      })}</div></div>
    </section>
  </div>;
}
