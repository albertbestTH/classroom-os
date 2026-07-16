"use client";

import type { DashboardClassroomComparison } from "@classroom-os/types";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ClassroomComparisonChart({ classrooms }: { classrooms: DashboardClassroomComparison[] }) {
  if (classrooms.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 px-5 py-12 text-center" role="status">
        <p className="font-semibold">ยังไม่มีข้อมูลเปรียบเทียบชั้นเรียน</p>
        <p className="mt-1 text-sm text-[#6B7280]">แต่ละชั้นและวิชาจะแสดงแยกกันเมื่อมีข้อมูล</p>
      </div>
    );
  }
  const data = classrooms.map((item) => ({
    ...item,
    label: `${item.classroomName} · ${item.subjectName}`,
    percentage: item.attendancePercentage,
  }));
  return (
    <figure aria-label="เปรียบเทียบอัตราการเข้าเรียนแยกตามชั้นเรียนและวิชา">
      <div style={{ height: Math.max(220, data.length * 54) }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 18, left: 4, bottom: 4 }}>
            <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: "#4B5563", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="label" width={145} tick={{ fill: "#374151", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(value, _, item) => [`${value ?? "–"}% · ${item.payload.attendedCount}/${item.payload.eligibleCount} รายการ`, "อัตราการเข้าเรียน"]} />
            <Bar dataKey="percentage" fill="#2563EB" radius={[0, 6, 6, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption>
        <ul className="mt-3 space-y-2 text-sm">
          {classrooms.map((item) => (
            <li key={`${item.classroomId}:${item.subjectId}`} className="flex flex-col justify-between gap-1 rounded-lg bg-slate-50 px-3 py-2 sm:flex-row">
              <span><strong>{item.classroomName}</strong> · {item.subjectName}</span>
              <span className="text-[#4B5563]">{item.attendancePercentage === null ? "ยังไม่มีข้อมูล" : `${item.attendancePercentage}% (${item.attendedCount}/${item.eligibleCount})`}</span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
