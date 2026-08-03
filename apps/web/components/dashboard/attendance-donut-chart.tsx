import type { AttendanceStatusTotals } from "@classroom-os/types";

const segments = [
  { key: "present", label: "มาเรียน", color: "#16B67A" },
  { key: "late", label: "สาย", color: "#F59E0B" },
  { key: "leave", label: "ลา", color: "#2563EB" },
  { key: "absent", label: "ขาดเรียน", color: "#F04D45" },
  { key: "unrecorded", label: "ยังไม่เช็กชื่อ", color: "#94A3B8" },
] as const;

type Props = {
  totals: AttendanceStatusTotals;
  eligibleCount: number;
  attendancePercentage: number;
};

export function AttendanceDonutChart({ totals, eligibleCount, attendancePercentage }: Props) {
  if (eligibleCount === 0) {
    return <div className="rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center" role="status"><p className="font-semibold">ยังไม่มีข้อมูลการเช็กชื่อวันนี้</p><p className="mt-1 text-sm text-slate-500">กราฟจะแสดงเมื่อมีคาบที่ถึงเวลาและมีนักเรียนในรายชื่อ</p></div>;
  }

  const data = segments.map((segment) => ({
    ...segment,
    value: totals[segment.key],
    percentage: eligibleCount ? (totals[segment.key] / eligibleCount) * 100 : 0,
  }));
  const visible = data.filter((segment) => segment.value > 0);
  const arcs = visible.map((segment, index) => ({
    ...segment,
    offset: visible.slice(0, index).reduce((sum, item) => sum + item.percentage, 0),
  }));
  const accessibilityLabel = `สรุปการเข้าเรียนวันนี้ ${data.map((item) => `${item.label} ${item.value} คน`).join(" ")}`;

  return (
    <figure aria-label={accessibilityLabel}>
      <div className="grid items-center gap-4 min-[1100px]:grid-cols-[160px_minmax(0,1fr)]">
        <div className="relative mx-auto h-40 w-40" role="img" aria-label={accessibilityLabel}>
          <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
            <g transform="rotate(-90 60 60)">
              <circle cx="60" cy="60" r="45" fill="none" stroke="#E8EEF6" strokeWidth="16" />
              {arcs.map((segment) => (
                <circle
                  key={segment.key}
                  cx="60"
                  cy="60"
                  r="45"
                  pathLength="100"
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="16"
                  strokeDasharray={`${segment.percentage} ${100 - segment.percentage}`}
                  strokeDashoffset={-segment.offset}
                />
              ))}
            </g>
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-slate-900">{attendancePercentage}%</span>
            <span className="text-xs font-medium text-slate-500">มาเรียน</span>
          </div>
        </div>
        <ul className="space-y-2 text-xs">
          {data.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />{item.label}</span>
              <strong>{item.value} คน ({Math.round(item.percentage)}%)</strong>
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="sr-only">บันทึกแล้ว {eligibleCount - totals.unrecorded} จาก {eligibleCount} คน</figcaption>
    </figure>
  );
}
