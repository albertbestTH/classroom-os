"use client";

import type { AttendanceStatusTotals } from "@classroom-os/types";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const segments = [{ key: "present", label: "มาเรียน", color: "#16B67A" }, { key: "absent", label: "ขาดเรียน", color: "#F04D45" }, { key: "late", label: "สาย", color: "#F59E0B" }, { key: "unchecked", label: "ยังไม่เช็กชื่อ", color: "#94A3B8" }] as const;
type Props = { totals: AttendanceStatusTotals; eligibleCount: number; attendancePercentage: number };

export function AttendanceDonutChart({ totals, eligibleCount, attendancePercentage }: Props) {
  if (eligibleCount === 0) return <div className="rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center" role="status"><p className="font-semibold">ยังไม่มีข้อมูลการเช็กชื่อวันนี้</p><p className="mt-1 text-sm text-slate-500">กราฟจะแสดงเมื่อมีคาบที่ถึงเวลาและมีนักเรียนในรายชื่อ</p></div>;
  const data = segments.map((segment) => ({ ...segment, value: segment.key === "unchecked" ? totals.unrecorded + totals.leave : totals[segment.key] }));
  return <figure aria-label={`สรุปการเข้าเรียนวันนี้ มาเรียน ${totals.present} ขาดเรียน ${totals.absent} สาย ${totals.late} ยังไม่เช็กชื่อ ${totals.unrecorded + totals.leave}`}><div className="grid items-center gap-4 sm:grid-cols-[160px_1fr]"><div className="relative h-40 w-40" aria-hidden="true"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" innerRadius={53} outerRadius={72} paddingAngle={2} stroke="#fff" strokeWidth={2}>{data.map((item) => <Cell key={item.key} fill={item.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-bold text-slate-900">{attendancePercentage}%</span><span className="text-xs font-medium text-slate-500">มาเรียน</span></div></div><ul className="space-y-2 text-xs">{data.map((item) => <li key={item.key} className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />{item.label}</span><strong>{item.value} คน ({eligibleCount ? Math.round((item.value / eligibleCount) * 100) : 0}%)</strong></li>)}</ul></div><figcaption className="sr-only">บันทึกแล้ว {eligibleCount - totals.unrecorded} จาก {eligibleCount} คน</figcaption></figure>;
}
