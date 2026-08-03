"use client";

import type { SubjectResult } from "@classroom-os/types";
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

function subjectDeleteError(error: unknown): string {
  if (error instanceof ApiClientError && error.code === "CONFLICT") {
    return "ไม่สามารถลบรายวิชานี้ได้ เพราะมีงานสอน ตารางสอน คาบเรียน หรือคะแนนที่เชื่อมอยู่ คุณสามารถปิดใช้งานแทนได้";
  }
  return thaiApiError(error);
}

export function SubjectManager({ subjects }: { subjects: SubjectResult[] }) {
  const router = useRouter();
  const formId = useId();
  const [editing, setEditing] = useState<SubjectResult | null>(null);
  const [deleting, setDeleting] = useState<SubjectResult | null>(null);
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
      await requestApi<SubjectResult>(editing ? `/api/subjects/${editing.id}` : "/api/subjects", {
        method: editing ? "PATCH" : "POST",
        body: { code: data.get("code"), name: data.get("name"), isActive: data.get("isActive") === "on" },
      });
      form.reset();
      setEditing(null);
      setFeedback({
        kind: "success",
        title: wasEditing ? "แก้ไขสำเร็จ" : "เพิ่มรายวิชาสำเร็จ",
        message: wasEditing ? "บันทึกข้อมูลรายวิชาที่แก้ไขเรียบร้อยแล้ว" : "เพิ่มรายวิชาใหม่เรียบร้อยแล้ว",
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
      await requestApi<SubjectResult>(`/api/subjects/${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      setFeedback({ kind: "success", title: "ลบรายวิชาสำเร็จ", message: `ลบ ${deleting.name} ออกจากระบบเรียบร้อยแล้ว` });
      router.refresh();
    } catch (deleteError) {
      setDeleting(null);
      setFeedback({ kind: "error", title: "ลบรายวิชาไม่สำเร็จ", message: subjectDeleteError(deleteError) });
    } finally {
      setPending(false);
    }
  }

  return <div className="mt-8 space-y-6">
    <form key={editing?.id ?? "new"} onSubmit={submit} className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm" aria-labelledby={`${formId}-heading`}>
      <div className="flex justify-between gap-4"><div><h2 id={`${formId}-heading`} className="text-lg font-bold">{editing ? "แก้ไขรายวิชา" : "เพิ่มรายวิชา"}</h2><p className="mt-1 text-sm text-[#6B7280]">รหัสรายวิชาต้องไม่ซ้ำภายในโรงเรียน</p></div>{editing ? <button type="button" onClick={() => setEditing(null)} className="min-h-11 rounded-lg px-3 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-blue-600">ยกเลิก</button> : null}</div>
      <div className="mt-5 grid gap-4 md:grid-cols-2"><div><label htmlFor={`${formId}-code`} className="mb-2 block text-sm font-semibold">รหัสวิชา</label><input id={`${formId}-code`} name="code" defaultValue={editing?.code} required className={inputStyles} /></div><div><label htmlFor={`${formId}-name`} className="mb-2 block text-sm font-semibold">ชื่อวิชา</label><input id={`${formId}-name`} name="name" defaultValue={editing?.name} required className={inputStyles} /></div></div>
      <label className="mt-4 flex w-fit items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} className="size-4 accent-blue-600" /> เปิดใช้งาน</label>
      {error ? <p className="mt-4 text-sm text-red-700" role="alert">{error}</p> : null}
      <div className="mt-5 flex justify-end"><button type="submit" disabled={pending} className="min-h-11 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-60">{pending ? "กำลังบันทึก…" : editing ? "บันทึกการแก้ไข" : "เพิ่มรายวิชา"}</button></div>
    </form>

    <section className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm" aria-labelledby="subject-list-heading">
      <div className="border-b px-5 py-4"><h2 id="subject-list-heading" className="font-bold">รายวิชาทั้งหมด</h2></div>
      {subjects.length === 0 ? <EmptyCollectionState title="ยังไม่มีรายวิชา" description="เพิ่มรายวิชาแรกเพื่อใช้กับงานสอนและตารางสอน" /> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><caption className="sr-only">รายวิชาของโรงเรียน</caption><thead className="bg-slate-50 text-[#6B7280]"><tr><th scope="col" className="px-5 py-3.5">รหัส</th><th scope="col" className="px-5 py-3.5">ชื่อวิชา</th><th scope="col" className="px-5 py-3.5">สถานะ</th><th scope="col"><span className="sr-only">จัดการ</span></th></tr></thead><tbody className="divide-y divide-slate-100">
        {subjects.map((item) => <tr key={item.id}><td className="px-5 py-4 font-mono text-xs">{item.code}</td><th scope="row" className="px-5 py-4 font-semibold">{item.name}</th><td className="px-5 py-4"><StatusBadge variant={item.isActive ? "success" : "neutral"}>{item.isActive ? "ใช้งาน" : "ปิดใช้งาน"}</StatusBadge></td><td className="px-5 py-4"><div className="flex justify-end gap-1"><button type="button" aria-label={`แก้ไข ${item.name}`} onClick={() => { setEditing(item); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"><Pencil aria-hidden="true" size={18} strokeWidth={1.9} /></button><button type="button" aria-label={`ลบ ${item.name}`} onClick={() => setDeleting(item)} className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"><Trash2 aria-hidden="true" size={18} strokeWidth={1.9} /></button></div></td></tr>)}
      </tbody></table></div>}
    </section>

    {deleting ? <ConfirmEntityDeleteDialog title="ลบรายวิชานี้?" description={`ต้องการลบ ${deleting.name} จริงหรือไม่? หากมีงานสอน ตารางสอน คาบเรียน หรือคะแนนเชื่อมอยู่ ระบบจะไม่อนุญาตให้ลบ`} busy={pending} onCancel={() => setDeleting(null)} onConfirm={() => void remove()} /> : null}
    {feedback ? <EntityActionResultDialog feedback={feedback} onClose={() => setFeedback(null)} /> : null}
  </div>;
}
