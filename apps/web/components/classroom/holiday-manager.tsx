"use client";

import type { SchoolHolidayResult, UserRole } from "@classroom-os/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { requestApi, thaiApiError } from "@/lib/client-api";

const control =
  "min-h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";

type HolidayForm = {
  localDate: string;
  name: string;
  description: string;
};

const emptyForm = (): HolidayForm => ({
  localDate: new Date().toISOString().slice(0, 10),
  name: "",
  description: "",
});

function sortHolidays(items: SchoolHolidayResult[]) {
  return [...items].sort((left, right) => left.localDate.localeCompare(right.localDate));
}

export function HolidayManager({
  holidays,
  role,
}: {
  holidays: SchoolHolidayResult[];
  role: UserRole;
}) {
  const router = useRouter();
  const submitting = useRef(false);
  const canManage = role === "SCHOOL_OWNER" || role === "ADMIN";
  const [localHolidays, setLocalHolidays] = useState<SchoolHolidayResult[]>([]);
  const [form, setForm] = useState<HolidayForm>(emptyForm);
  const [editing, setEditing] = useState<SchoolHolidayResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(null), 4_000);
    return () => window.clearTimeout(timer);
  }, [success]);

  const displayHolidays = useMemo(
    () =>
      sortHolidays([
        ...new Map([...holidays, ...localHolidays].map((holiday) => [holiday.id, holiday])).values(),
      ]),
    [holidays, localHolidays],
  );

  function openEdit(holiday: SchoolHolidayResult) {
    setEditing(holiday);
    setForm({
      localDate: holiday.localDate,
      name: holiday.name,
      description: holiday.description ?? "",
    });
    setError(null);
    setSuccess(null);
  }

  function cancelEdit() {
    setEditing(null);
    setForm(emptyForm());
    setError(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || submitting.current || pending) return;
    submitting.current = true;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        localDate: form.localDate,
        name: form.name,
        description: form.description.trim() ? form.description : null,
      };
      const saved = editing
        ? await requestApi<SchoolHolidayResult>(`/api/holidays/${editing.id}`, {
            method: "PATCH",
            body: payload,
          })
        : await requestApi<SchoolHolidayResult>("/api/holidays", { body: payload });
      setLocalHolidays((current) => [
        ...current.filter((holiday) => holiday.id !== saved.id),
        saved,
      ]);
      setSuccess(editing ? "บันทึกวันหยุดแล้ว" : "เพิ่มวันหยุดแล้ว");
      setEditing(null);
      setForm(emptyForm());
      router.refresh();
    } catch (submitError) {
      setError(thaiApiError(submitError));
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  async function toggleActive(holiday: SchoolHolidayResult) {
    if (!canManage || pending) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const saved = await requestApi<SchoolHolidayResult>(`/api/holidays/${holiday.id}`, {
        method: "PATCH",
        body: { isActive: !holiday.isActive },
      });
      setLocalHolidays((current) => [
        ...current.filter((item) => item.id !== saved.id),
        saved,
      ]);
      setSuccess(saved.isActive ? "เปิดใช้งานวันหยุดแล้ว" : "ปิดใช้งานวันหยุดแล้ว");
      router.refresh();
    } catch (submitError) {
      setError(thaiApiError(submitError));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">ปฏิทินโรงเรียน</p>
          <h2 className="text-xl font-bold text-[#111827]">ปฏิทินวันหยุด</h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            วันที่เปิดใช้งานจะไม่ถูกสร้างเป็นคาบเรียนจากตารางสอน และครูจะเห็นเป็นวันหยุดในหน้า Today
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          {displayHolidays.filter((holiday) => holiday.isActive).length} วันเปิดใช้งาน
        </span>
      </div>

      {canManage ? (
        <form className="mt-5 grid gap-3 lg:grid-cols-[160px_1fr_1fr_auto]" onSubmit={submit}>
          <label className="text-sm font-medium text-[#111827]">
            วันที่
            <input
              className={`${control} mt-1`}
              type="date"
              value={form.localDate}
              onChange={(event) => setForm((current) => ({ ...current, localDate: event.target.value }))}
              required
            />
          </label>
          <label className="text-sm font-medium text-[#111827]">
            ชื่อวันหยุด
            <input
              className={`${control} mt-1`}
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="เช่น วันหยุดนักขัตฤกษ์"
              required
            />
          </label>
          <label className="text-sm font-medium text-[#111827]">
            หมายเหตุ
            <input
              className={`${control} mt-1`}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="ไม่บังคับ"
            />
          </label>
          <div className="flex items-end gap-2">
            <button
              className="min-h-11 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/30 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={pending}
            >
              {pending ? "กำลังบันทึก..." : editing ? "บันทึก" : "เพิ่ม"}
            </button>
            {editing ? (
              <button
                className="min-h-11 rounded-xl border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827] transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                type="button"
                onClick={cancelEdit}
              >
                ยกเลิก
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#E5E7EB] text-xs uppercase tracking-wide text-[#6B7280]">
            <tr>
              <th className="px-3 py-3 font-semibold">วันที่</th>
              <th className="px-3 py-3 font-semibold">ชื่อวันหยุด</th>
              <th className="px-3 py-3 font-semibold">หมายเหตุ</th>
              <th className="px-3 py-3 font-semibold">สถานะ</th>
              {canManage ? <th className="px-3 py-3 text-right font-semibold">จัดการ</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {displayHolidays.map((holiday) => (
              <tr key={holiday.id} className="align-top">
                <td className="px-3 py-3 font-medium text-[#111827]">{holiday.localDate}</td>
                <td className="px-3 py-3 text-[#111827]">{holiday.name}</td>
                <td className="px-3 py-3 text-[#6B7280]">{holiday.description ?? "—"}</td>
                <td className="px-3 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      holiday.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {holiday.isActive ? "ใช้งาน" : "ปิดไว้"}
                  </span>
                </td>
                {canManage ? (
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        className="min-h-10 rounded-xl border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#111827] transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                        type="button"
                        onClick={() => openEdit(holiday)}
                      >
                        แก้ไข
                      </button>
                      <button
                        className="min-h-10 rounded-xl border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#111827] transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                        type="button"
                        onClick={() => toggleActive(holiday)}
                        disabled={pending}
                      >
                        {holiday.isActive ? "ปิด" : "เปิด"}
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
            {displayHolidays.length === 0 ? (
              <tr>
                <td
                  className="px-3 py-8 text-center text-sm text-[#6B7280]"
                  colSpan={canManage ? 5 : 4}
                >
                  ยังไม่มีวันหยุดในภาคเรียนนี้
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
