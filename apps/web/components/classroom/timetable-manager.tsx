"use client";

import type { TeachingAssignmentResult, TimetableEntryResult, UserRole } from "@classroom-os/types";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";

import { requestApi, thaiApiError } from "@/lib/client-api";

const days = [
  { value: 1, label: "วันจันทร์" },
  { value: 2, label: "วันอังคาร" },
  { value: 3, label: "วันพุธ" },
  { value: 4, label: "วันพฤหัสบดี" },
  { value: 5, label: "วันศุกร์" },
];
const control = "min-h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";

export function TimetableManager({
  entries,
  assignments,
  role,
}: {
  entries: TimetableEntryResult[];
  assignments: TeachingAssignmentResult[];
  role: UserRole;
}) {
  const router = useRouter();
  const id = useId();
  const [teacher, setTeacher] = useState("");
  const [classroom, setClassroom] = useState("");
  const [subject, setSubject] = useState("");
  const [editing, setEditing] = useState<TimetableEntryResult | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filtered = useMemo(
    () => entries.filter((entry) =>
      (!teacher || entry.teacherId === teacher) &&
      (!classroom || entry.classroomId === classroom) &&
      (!subject || entry.subjectId === subject)),
    [entries, teacher, classroom, subject],
  );
  const unique = <T extends { id: string }>(items: T[]) =>
    [...new Map(items.map((item) => [item.id, item])).values()];
  const teachers = unique(assignments.map((item) => ({ id: item.teacherId, name: item.teacherName })));
  const classrooms = unique(assignments.map((item) => ({ id: item.classroomId, name: item.classroomName })));
  const subjects = unique(assignments.map((item) => ({ id: item.subjectId, name: `${item.subjectCode} · ${item.subjectName}` })));

  function openCreate() {
    setEditing(null);
    setError(null);
    setShowForm(true);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      if (editing) {
        await requestApi<TimetableEntryResult>(`/api/timetable/${editing.id}`, {
          method: "PATCH",
          body: {
            weekday: Number(form.get("weekday")),
            startTime: form.get("startTime"),
            endTime: form.get("endTime"),
            room: form.get("room") || null,
          },
        });
      } else {
        await requestApi<TimetableEntryResult>("/api/timetable", {
          body: {
            teachingAssignmentId: form.get("teachingAssignmentId"),
            weekday: Number(form.get("weekday")),
            startTime: form.get("startTime"),
            endTime: form.get("endTime"),
            room: form.get("room") || null,
          },
        });
      }
      setShowForm(false);
      setEditing(null);
      router.refresh();
    } catch (submitError) {
      setError(thaiApiError(submitError));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm lg:flex-row lg:items-end">
        {role !== "TEACHER" ? (
          <>
            <label className="block flex-1 text-sm font-semibold">ครู<select value={teacher} onChange={(event) => setTeacher(event.target.value)} className={`${control} mt-2`}><option value="">ครูทุกคน</option>{teachers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="block flex-1 text-sm font-semibold">ห้องเรียน<select value={classroom} onChange={(event) => setClassroom(event.target.value)} className={`${control} mt-2`}><option value="">ทุกห้อง</option>{classrooms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="block flex-1 text-sm font-semibold">รายวิชา<select value={subject} onChange={(event) => setSubject(event.target.value)} className={`${control} mt-2`}><option value="">ทุกวิชา</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          </>
        ) : <p className="flex-1 text-sm text-[#6B7280]">แสดงเฉพาะงานสอนที่มอบหมายให้คุณในภาคเรียนปัจจุบัน</p>}
        <button type="button" onClick={openCreate} className="min-h-11 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">+ เพิ่มคาบเรียน</button>
      </div>

      {showForm ? (
        <form onSubmit={submit} className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5" aria-labelledby={`${id}-form-title`}>
          <div className="flex items-center justify-between gap-4"><h2 id={`${id}-form-title`} className="text-lg font-bold">{editing ? "แก้ไขคาบเรียน" : "เพิ่มคาบเรียน"}</h2><button type="button" onClick={() => setShowForm(false)} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">ยกเลิก</button></div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {!editing ? <label className="text-sm font-semibold xl:col-span-2">งานสอน<select name="teachingAssignmentId" required className={`${control} mt-2`} defaultValue=""><option value="" disabled>เลือกห้องเรียนและวิชา</option>{assignments.map((item) => <option key={item.id} value={item.id}>{item.teacherName} · {item.classroomName} · {item.subjectName}</option>)}</select></label> : <div className="text-sm xl:col-span-2"><p className="font-semibold">งานสอน</p><p className="mt-2 rounded-xl bg-white px-3 py-3">{editing.teacherName} · {editing.classroomName} · {editing.subjectName}</p></div>}
            <label className="text-sm font-semibold">วัน<select name="weekday" defaultValue={editing?.weekday ?? 1} className={`${control} mt-2`}>{days.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}</select></label>
            <label className="text-sm font-semibold">เวลาเริ่ม<input name="startTime" type="time" required defaultValue={editing?.startTime ?? "08:00"} className={`${control} mt-2`} /></label>
            <label className="text-sm font-semibold">เวลาสิ้นสุด<input name="endTime" type="time" required defaultValue={editing?.endTime ?? "08:50"} className={`${control} mt-2`} /></label>
            <label className="text-sm font-semibold">ห้อง<input name="room" defaultValue={editing?.room ?? ""} className={`${control} mt-2`} /></label>
          </div>
          {error ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p> : null}
          <div className="mt-5 flex justify-end"><button type="submit" disabled={pending} className="min-h-11 rounded-xl bg-blue-600 px-6 py-2 text-sm font-bold text-white disabled:opacity-60">{pending ? "กำลังบันทึก…" : "บันทึกคาบเรียน"}</button></div>
        </form>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm" aria-labelledby="weekly-timetable-heading">
        <div className="border-b border-[#E5E7EB] px-5 py-4"><h2 id="weekly-timetable-heading" className="font-bold">ตารางประจำสัปดาห์</h2><p className="mt-1 text-sm text-[#6B7280]">เลื่อนในแนวนอนเพื่อดูวันอื่นบนหน้าจอขนาดเล็ก</p></div>
        <div className="overflow-x-auto p-4 sm:p-5">
          <div className="grid min-w-[1000px] grid-cols-5 gap-3">
            {days.map((day) => (
              <section key={day.value} aria-labelledby={`${id}-day-${day.value}`} className="rounded-xl bg-slate-50 p-3">
                <h3 id={`${id}-day-${day.value}`} className="text-center font-bold">{day.label}</h3>
                <div className="mt-3 space-y-3">
                  {filtered.filter((entry) => entry.weekday === day.value).map((entry) => (
                    <article key={entry.id} className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
                      <p className="text-sm font-bold text-blue-800">{entry.startTime}–{entry.endTime}</p>
                      <p className="mt-2 font-semibold">{entry.subjectName}</p>
                      <p className="mt-1 text-sm text-[#6B7280]">{entry.classroomName}</p>
                      <p className="mt-1 text-xs text-[#6B7280]">{entry.teacherName} · ห้อง {entry.room ?? "—"}</p>
                      <p className="mt-1 text-xs text-[#6B7280]">{entry.termName} · {entry.academicYearName}</p>
                      <button type="button" onClick={() => { setEditing(entry); setShowForm(true); setError(null); }} className="mt-3 min-h-11 rounded-lg px-3 text-sm font-semibold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">แก้ไข</button>
                    </article>
                  ))}
                  {filtered.every((entry) => entry.weekday !== day.value) ? <p className="rounded-lg border border-dashed border-slate-300 px-3 py-8 text-center text-sm text-slate-500">ไม่มีคาบเรียน</p> : null}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
