"use client";

import { useRouter } from "next/navigation";

type Option = { id: string; label: string };

export function AttendanceScopeSelect({ options, value }: { options: Option[]; value?: string }) {
  const router = useRouter();
  return <label className="flex items-center gap-2 text-xs font-semibold text-slate-500"><span className="sr-only">เลือกห้องเรียนสำหรับภาพรวมการเข้าเรียน</span><select aria-label="เลือกห้องเรียนสำหรับภาพรวมการเข้าเรียน" value={value ?? ""} onChange={(event) => { const params = new URLSearchParams(window.location.search); if (event.target.value) params.set("classroomId", event.target.value); else params.delete("classroomId"); router.push(`/?${params.toString()}`); }} className="min-h-10 max-w-[170px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"><option value="">ทุกห้องเรียน</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>;
}
