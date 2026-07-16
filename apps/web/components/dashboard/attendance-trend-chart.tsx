"use client";

import type { DashboardTrendPoint } from "@classroom-os/types";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function thaiDate(date: string, format: "short" | "long" = "short") {
  return new Intl.DateTimeFormat("th-TH", format === "short"
    ? { day: "numeric", month: "short", timeZone: "UTC" }
    : { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

export function AttendanceTrendChart({ points }: { points: DashboardTrendPoint[] }) {
  const hasData = points.some(({ percentage }) => percentage !== null);
  if (!hasData) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 px-5 py-12 text-center" role="status">
        <p className="font-semibold">ยังไม่มีคาบที่มีข้อมูลการเข้าเรียนในช่วงนี้</p>
        <p className="mt-1 text-sm text-[#6B7280]">วันที่ไม่มีคาบจะไม่ถูกนับเป็นการเข้าเรียน 0%</p>
      </div>
    );
  }
  const chartData = points.map((point) => ({
    ...point,
    label: thaiDate(point.date),
    tooltip: point.percentage === null
      ? "ไม่มีคาบหรือยังไม่ถึงเวลา"
      : `เข้าเรียน ${point.attendedCount}/${point.eligibleCount} รายการ (${point.percentage}%)`,
  }));
  const noSessionDates = points.filter(({ hasSessions }) => !hasSessions).map(({ date }) => thaiDate(date));

  return (
    <figure aria-label="แนวโน้มอัตราการเข้าเรียนตามวัน">
      <div className="h-64" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 4 }}>
            <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#4B5563", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: "#4B5563", fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip labelFormatter={(_, payload) => payload[0] ? thaiDate(payload[0].payload.date, "long") : ""} formatter={(_, __, item) => [item.payload.tooltip, "อัตราการเข้าเรียน"]} />
            <Line type="monotone" dataKey="percentage" stroke="#2563EB" strokeWidth={3} dot={{ r: 4, fill: "#FFFFFF", strokeWidth: 3 }} activeDot={{ r: 6 }} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-3 text-xs leading-5 text-[#6B7280]">
        เส้นขาดหมายถึงไม่มีคาบที่นับผลหรือยังไม่ถึงเวลา{noSessionDates.length ? ` · ไม่มีคาบ: ${noSessionDates.join(", ")}` : ""}
      </figcaption>
    </figure>
  );
}
