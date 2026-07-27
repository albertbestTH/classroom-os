import { formatAttendancePercentage, type AttendanceSummary } from "@classroom-os/types";

const statusConfig = [
  { key: "present", percentageKey: "presentPercentage", label: "มา", color: "#16B67A", classes: "text-emerald-700" },
  { key: "late", percentageKey: "latePercentage", label: "สาย", color: "#F59E0B", classes: "text-amber-700" },
  { key: "leave", percentageKey: "leavePercentage", label: "ลา", color: "#94A3B8", classes: "text-slate-600" },
  { key: "absent", percentageKey: "absentPercentage", label: "ขาด", color: "#F04D45", classes: "text-red-700" },
  { key: "unrecorded", percentageKey: "unrecordedPercentage", label: "ยังไม่บันทึก", color: "#94A3B8", classes: "text-slate-600" },
] as const;

export function AttendanceDashboard({ summary }: { summary: AttendanceSummary }) {
  const statuses = statusConfig.filter((status) => summary[status.key] > 0 || status.key !== "unrecorded");
  const segments = statuses.map((status, index) => ({
    ...status,
    offset: statuses.slice(0, index).reduce((total, item) => total + summary[item.percentageKey], 0),
  }));
  if (summary.enrolled === 0) return <section aria-labelledby="attendance-overview" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 id="attendance-overview" className="text-lg font-extrabold">ภาพรวมการเข้าเรียน</h2><div className="mt-4 rounded-2xl bg-blue-50 p-5"><p className="font-bold">ยังไม่มีนักเรียนในชั้นเรียน</p><p className="mt-1 text-sm text-slate-600">ไม่มีข้อมูลสำหรับแสดงสัดส่วนการเข้าเรียน</p></div></section>;
  return <section aria-labelledby="attendance-overview" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <h2 id="attendance-overview" className="text-lg font-extrabold text-slate-900">ภาพรวมการเข้าเรียน</h2>
    <div className="mt-5 grid items-center gap-6 sm:grid-cols-[180px_minmax(0,1fr)]">
      <div className="relative mx-auto h-44 w-44" role="img" aria-label={`นักเรียนทั้งหมด ${summary.enrolled} คน ${statuses.map((status) => `${status.label} ${summary[status.key]} คน ร้อยละ ${summary[status.percentageKey]}`).join(" ")}`}>
        <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true"><g transform="rotate(-90 60 60)"><circle cx="60" cy="60" r="45" fill="none" stroke="#E5E7EB" strokeWidth="16" />{segments.map((status) => <circle key={status.key} cx="60" cy="60" r="45" pathLength="100" fill="none" stroke={status.color} strokeWidth="16" strokeDasharray={`${summary[status.percentageKey]} ${100 - summary[status.percentageKey]}`} strokeDashoffset={-status.offset} />)}</g></svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center"><strong className="text-3xl tabular-nums">{summary.enrolled}</strong><span className="text-xs text-slate-500">นักเรียนทั้งหมด</span></div>
      </div>
      <ul className="space-y-2">{statuses.map((status) => <li key={status.key} className="grid min-h-10 grid-cols-[auto_1fr_auto_auto] items-center gap-3"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.color }} /><span className={`font-bold ${status.classes}`}>{status.label}</span><span className="font-semibold tabular-nums">{summary[status.key]} คน</span><span className="min-w-14 text-right text-sm text-slate-500 tabular-nums">{formatAttendancePercentage(summary[status.percentageKey])}</span></li>)}</ul>
    </div>
    <div className="mt-5 border-t border-slate-100 pt-4"><div className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold">บันทึกเช็กชื่อแล้ว {summary.recorded}/{summary.enrolled} คน</span><span className="text-slate-500">{formatAttendancePercentage(summary.completionPercentage)}</span></div><div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="ความคืบหน้าการบันทึกเช็กชื่อ" aria-valuemin={0} aria-valuemax={summary.enrolled} aria-valuenow={summary.recorded}><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, summary.completionPercentage)}%` }} /></div></div>
  </section>;
}
