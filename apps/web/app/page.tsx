import { getTodayTimetable } from "@classroom-os/database";

import { AppShell } from "@/components/app-shell";
import { StartClassButton } from "@/components/classroom/start-class-button";
import { TodaySchedule } from "@/components/classroom/today-schedule";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { requireWebSession } from "@/lib/auth";

export default async function DashboardPage() {
  const { context, user } = await requireWebSession();
  const today = await getTodayTimetable({
    schoolId: context.schoolId,
    role: context.role,
    teacherId: context.teacherId,
  });
  const dateLabel = new Intl.DateTimeFormat("th-TH", {
    dateStyle: "full",
    timeZone: today.timezone,
  }).format(new Date());

  return (
    <AppShell>
      <PageHeader
        eyebrow={dateLabel}
        title={`สวัสดีครับ ${user.firstName}`}
        description={context.role === "TEACHER" ? "คาบเรียนและงานที่ต้องจัดการวันนี้" : "ภาพรวมการสอนของโรงเรียนวันนี้"}
        action={today.nextClass ? <StartClassButton item={today.nextClass} localDate={today.localDate} compact /> : undefined}
      />
      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="สถิติวันนี้">
        <StatCard label="คาบเรียนวันนี้" value={String(today.classes.length)} detail={today.currentTerm ? `${today.currentTerm.name} · ${today.currentTerm.academicYearName}` : "ยังไม่ได้กำหนดภาคเรียนปัจจุบัน"} />
        <StatCard label="สอนเสร็จแล้ว" value={String(today.completedCount)} detail="คาบที่จบสมบูรณ์แล้ว" />
        <StatCard label="กำลังสอน" value={String(today.classes.filter((item) => item.status === "live").length)} detail="กลับเข้าสู่คาบได้ทันที" />
        <StatCard label="ยังไม่ได้เริ่ม" value={String(today.missedCount)} detail="คาบที่เลยเวลาสิ้นสุดแล้ว" />
      </section>
      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <TodaySchedule today={today} />
        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="next-class-heading">
          <h2 id="next-class-heading" className="text-xl font-bold">คาบถัดไป</h2>
          {today.nextClass ? (
            <div className="mt-5">
              <p className="text-2xl font-bold">{today.nextClass.timetableEntry.subjectName}</p>
              <p className="mt-2 text-[#6B7280]">{today.nextClass.timetableEntry.classroomName}</p>
              <p className="mt-1 text-sm text-[#6B7280]">{today.nextClass.timetableEntry.startTime}–{today.nextClass.timetableEntry.endTime} · ห้อง {today.nextClass.timetableEntry.room ?? "—"}</p>
              <div className="mt-6"><StartClassButton item={today.nextClass} localDate={today.localDate} /></div>
            </div>
          ) : (
            <p className="mt-5 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-[#6B7280]">ไม่มีคาบที่ต้องเริ่มต่อในวันนี้</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
