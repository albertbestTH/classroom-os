"use client";

import type { AttendanceStatusTotals } from "@classroom-os/types";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const segments = [
  { key: "present", label: "มาเรียน", color: "#2563EB" },
  { key: "late", label: "มาสาย", color: "#B45309" },
  { key: "absent", label: "ขาดเรียน", color: "#DC2626" },
  { key: "leave", label: "ลา", color: "#7C3AED" },
] as const;

type AttendanceDonutChartProps = {
  totals: AttendanceStatusTotals;
  eligibleCount: number;
  attendancePercentage: number;
};

export function AttendanceDonutChart({ totals, eligibleCount, attendancePercentage }: AttendanceDonutChartProps) {
  const data = segments.map((segment) => ({ ...segment, value: totals[segment.key] }));
  const recordedTotal = data.reduce((sum, item) => sum + item.value, 0);

  if (eligibleCount === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 px-5 py-12 text-center" role="status">
        <p className="font-semibold text-[#111827]">ยังไม่มีข้อมูลการเช็กชื่อวันนี้</p>
        <p className="mt-1 text-sm text-[#6B7280]">กราฟจะแสดงเมื่อมีคาบที่ถึงเวลาและมีนักเรียนในรายชื่อ</p>
      </div>
    );
  }

  return (
    <figure aria-label={`สรุปการเข้าเรียนวันนี้ มาเรียน ${totals.present} มาสาย ${totals.late} ขาดเรียน ${totals.absent} ลา ${totals.leave} จากทั้งหมด ${eligibleCount} รายการ`}>
      <div className="relative mx-auto h-56 max-w-sm" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius={66} outerRadius={92} paddingAngle={2} stroke="#FFFFFF" strokeWidth={2}>
              {data.map((item) => <Cell key={item.key} fill={item.color} />)}
            </Pie>
            <Tooltip formatter={(value, name) => [`${Number(value)} รายการ`, String(name)]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-[#111827]">{attendancePercentage}%</span>
          <span className="mt-1 text-xs font-medium text-[#6B7280]">เข้าเรียน</span>
        </div>
      </div>
      <figcaption>
        <ul className="grid grid-cols-2 gap-2 text-sm">
          {data.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />{item.label}</span>
              <strong>{item.value}</strong>
            </li>
          ))}
        </ul>
        {totals.unrecorded > 0 ? <p className="mt-3 text-sm text-amber-800">ยังไม่บันทึก {totals.unrecorded} รายการ</p> : null}
        <p className="sr-only">บันทึกแล้ว {recordedTotal} จาก {eligibleCount} รายการ อัตราเข้าเรียน {attendancePercentage} เปอร์เซ็นต์</p>
      </figcaption>
    </figure>
  );
}
