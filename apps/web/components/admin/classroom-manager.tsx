"use client";

import type { ClassroomResult } from "@classroom-os/types";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { EmptyCollectionState } from "@/components/admin/admin-state";
import {
  ConfirmEntityDeleteDialog,
  EntityActionResultDialog,
  type EntityActionFeedback,
} from "@/components/admin/entity-action-dialog";
import { StatusBadge } from "@/components/status-badge";
import { ApiClientError, requestApi, thaiApiError } from "@/lib/client-api";

const inputStyles = "min-h-11 w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";

function classroomDeleteError(error: unknown): string {
  if (error instanceof ApiClientError && error.code === "CONFLICT") {
    return "ไม่สามารถลบชั้นเรียนนี้ได้ เพราะมีนักเรียน งานสอน ตารางสอน หรือประวัติคาบเรียนที่เชื่อมอยู่ คุณสามารถปิดใช้งานแทนได้";
  }
  return thaiApiError(error);
}

export function ClassroomManager({ classrooms }: { classrooms: ClassroomResult[] }) {
  const router = useRouter();
  const formId = useId();
  const [editing, setEditing] = useState<ClassroomResult | null>(null);
  const [deleting, setDeleting] = useState<ClassroomResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<EntityActionFeedback | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const wasEditing = Boolean(editing);
    setPending(true);
    setError(null);
    try {
      const body = {
        code: data.get("code"),
        name: data.get("name"),
        gradeLevel: data.get("gradeLevel"),
        isActive: data.get("isActive") === "on",
      };
      await requestApi<ClassroomResult>(editing ? `/api/classrooms/${editing.id}` : "/api/classrooms", {
        method: editing ? "PATCH" : "POST",
        body,
      });
      form.reset();
      setEditing(null);
      setFeedback({
        kind: "success",
        title: wasEditing ? "แก้ไขสำเร็จ" : "เพิ่มชั้นเรียนสำเร็จ",
        message: wasEditing ? "บันทึกข้อมูลชั้นเรียนที่แก้ไขเรียบร้อยแล้ว" : "เพิ่มชั้นเรียนใหม่เรียบร้อยแล้ว",
      });
      router.refresh();
    } catch (submitError) {
      setError(thaiApiError(submitError));
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!deleting || pending) return;
    setPending(true);
    try {
      await requestApi<ClassroomResult>(`/api/classrooms/${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      setFeedback({ kind: "success", title: "ลบชั้นเรียนสำเร็จ", message: `ลบ ${deleting.name} ออกจากระบบเรียบร้อยแล้ว` });
      router.refresh();
    } catch (deleteError) {
      setDeleting(null);
      setFeedback({ kind: "error", title: "ลบชั้นเรียนไม่สำเร็จ", message: classroomDeleteError(deleteError) });
    } finally {
      setPending(false);
    }
  }

  return <div className="mt-8 space-y-6">
    <form key={editing?.id ?? "new"} onSubmit={submit} className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm" aria-labelledby={`${formId}-heading`}>
      <div className="flex items-center justify-between gap-4">
        <div><h2 id={`${formId}-heading`} className="text-lg font-bold">{editing ? "แก้ไขชั้นเรียน" : "เพิ่มชั้นเรียน"}</h2><p className="mt-1 text-sm text-[#6B7280]">รหัสชั้นเรียนต้องไม่ซ้ำภายในโรงเรียน</p></div>
        {editing ? <button type="button" onClick={() => setEditing(null)} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-[#6B7280] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">ยกเลิก</button> : null}
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div><label htmlFor={`${formId}-code`} className="mb-2 block text-sm font-semibold">รหัสชั้นเรียน</label><input id={`${formId}-code`} name="code" defaultValue={editing?.code} required className={inputStyles} /></div>
        <div><label htmlFor={`${formId}-name`} className="mb-2 block text-sm font-semibold">ชื่อห้องเรียน</label><input id={`${formId}-name`} name="name" defaultValue={editing?.name} required className={inputStyles} /></div>
        <div><label htmlFor={`${formId}-grade`} className="mb-2 block text-sm font-semibold">ระดับชั้น</label><input id={`${formId}-grade`} name="gradeLevel" defaultValue={editing?.gradeLevel} required className={inputStyles} /></div>
      </div>
      <label className="mt-4 flex w-fit items-center gap-2 text-sm"><input name="isActive" type="checkbox" defaultChecked={editing?.isActive ?? true} className="size-4 accent-blue-600" /> เปิดใช้งาน</label>
      {error ? <p className="mt-4 text-sm text-red-700" role="alert">{error}</p> : null}
      <div className="mt-5 flex justify-end"><button type="submit" disabled={pending} className="min-h-11 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-60">{pending ? "กำลังบันทึก…" : editing ? "บันทึกการแก้ไข" : "เพิ่มชั้นเรียน"}</button></div>
    </form>

    <section className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm" aria-labelledby="classroom-list-heading">
      <div className="border-b px-5 py-4"><h2 id="classroom-list-heading" className="font-bold">ชั้นเรียนทั้งหมด</h2></div>
      {classrooms.length === 0 ? <EmptyCollectionState title="ยังไม่มีชั้นเรียน" description="เพิ่มชั้นเรียนแรกเพื่อเริ่มจัดนักเรียนและงานสอน" /> : <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><caption className="sr-only">รายการชั้นเรียนในโรงเรียน</caption><thead className="bg-slate-50 text-[#6B7280]"><tr><th scope="col" className="px-5 py-3.5">รหัส</th><th scope="col" className="px-5 py-3.5">ชื่อห้อง</th><th scope="col" className="px-5 py-3.5">ระดับชั้น</th><th scope="col" className="px-5 py-3.5 text-right">นักเรียน</th><th scope="col" className="px-5 py-3.5 text-right">งานสอน</th><th scope="col" className="px-5 py-3.5">สถานะ</th><th scope="col"><span className="sr-only">จัดการ</span></th></tr></thead><tbody className="divide-y divide-slate-100">
        {classrooms.map((item) => <tr key={item.id}><td className="px-5 py-4 font-mono text-xs">{item.code}</td><th scope="row" className="px-5 py-4 font-semibold">{item.name}</th><td className="px-5 py-4">{item.gradeLevel}</td><td className="px-5 py-4 text-right">{item.studentCount ?? "—"}</td><td className="px-5 py-4 text-right">{item.teachingAssignmentCount ?? "—"}</td><td className="px-5 py-4"><StatusBadge variant={item.isActive ? "success" : "neutral"}>{item.isActive ? "ใช้งาน" : "ปิดใช้งาน"}</StatusBadge></td><td className="px-5 py-4"><div className="flex justify-end gap-1"><button type="button" aria-label={`แก้ไข ${item.name}`} onClick={() => { setEditing(item); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"><Pencil aria-hidden="true" size={18} strokeWidth={1.9} /></button><button type="button" aria-label={`ลบ ${item.name}`} onClick={() => setDeleting(item)} className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"><Trash2 aria-hidden="true" size={18} strokeWidth={1.9} /></button></div></td></tr>)}
      </tbody></table></div>}
    </section>

    {deleting ? <ConfirmEntityDeleteDialog title="ลบชั้นเรียนนี้?" description={`ต้องการลบ ${deleting.name} จริงหรือไม่? หากมีนักเรียน งานสอน ตารางสอน หรือประวัติคาบเรียนเชื่อมอยู่ ระบบจะไม่อนุญาตให้ลบ`} busy={pending} onCancel={() => setDeleting(null)} onConfirm={() => void remove()} /> : null}
    {feedback ? <EntityActionResultDialog feedback={feedback} onClose={() => setFeedback(null)} /> : null}
  </div>;
}
