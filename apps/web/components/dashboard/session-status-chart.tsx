import type { DashboardSessionStatusTotals } from "@classroom-os/types";

const statuses = [
  { key: "scheduled", label: "รอเริ่ม", color: "#64748B" },
  { key: "live", label: "กำลังสอน", color: "#2563EB" },
  { key: "completed", label: "เสร็จแล้ว", color: "#15803D" },
  { key: "cancelled", label: "ยกเลิก", color: "#7C3AED" },
  { key: "missed", label: "เลยเวลา", color: "#DC2626" },
  { key: "attendanceIncomplete", label: "เช็กชื่อไม่ครบ", color: "#B45309" },
] as const;

export function SessionStatusChart({ totals }: { totals: DashboardSessionStatusTotals }) {
  const total = statuses.slice(0, 5).reduce((sum, status) => sum + totals[status.key], 0);
  if (total === 0) {
    return <p className="rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-[#6B7280]" role="status">วันนี้ยังไม่มีคาบเรียนในขอบเขตนี้</p>;
  }
  return (
    <figure aria-label={`สถานะคาบเรียนวันนี้ทั้งหมด ${total} คาบ`}>
      <div className="flex h-4 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        {statuses.slice(0, 5).map((status) => totals[status.key] > 0 ? (
          <span key={status.key} style={{ width: `${(totals[status.key] / total) * 100}%`, backgroundColor: status.color }} />
        ) : null)}
      </div>
      <figcaption>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {statuses.map((status) => (
            <li key={status.key} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.color }} aria-hidden="true" />{status.label}</span>
              <strong>{totals[status.key]}</strong>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
