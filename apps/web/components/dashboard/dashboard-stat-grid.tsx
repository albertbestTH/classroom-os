import type { DashboardOverviewResult } from "@classroom-os/types";

import { StatCard } from "@/components/stat-card";

export function DashboardStatGrid({ overview }: { overview: DashboardOverviewResult }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="ตัวเลขสำคัญวันนี้">
      <StatCard label="อัตราเข้าเรียนวันนี้" value={`${overview.attendance.attendancePercentage}%`} detail={`มาเรียนหรือมาสาย ${overview.attendance.attendedCount}/${overview.attendance.eligibleCount} รายการ`} />
      <StatCard label="บันทึกการเข้าเรียนครบ" value={`${overview.attendance.completionPercentage}%`} detail={`บันทึกแล้ว ${overview.attendance.recordedCount}/${overview.attendance.eligibleCount} รายการ`} />
      <StatCard label="คาบกำลังสอน" value={String(overview.sessionStatus.live)} detail={`เสร็จแล้ว ${overview.sessionStatus.completed} · รอเริ่ม ${overview.sessionStatus.scheduled}`} />
      <StatCard label="ต้องติดตาม" value={String(overview.actions.length)} detail={`เลยเวลา ${overview.sessionStatus.missed} · เช็กชื่อไม่ครบ ${overview.sessionStatus.attendanceIncomplete}`} />
    </section>
  );
}
