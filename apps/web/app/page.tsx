import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { dashboardStats, dashboardTasks, todayLessons } from "@/data/mock-data";

const primaryButtonStyles =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2";

export default function DashboardPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="วันจันทร์ที่ 6 กรกฎาคม 2569"
        title="สวัสดีครับ ครูสมชาย"
        description="ภาพรวมคาบเรียนและงานที่ต้องจัดการวันนี้"
        action={
          <button type="button" className={primaryButtonStyles}>
            + เริ่มคาบเรียน
          </button>
        }
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="สถิติวันนี้">
        {dashboardStats.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="today-schedule-heading">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 id="today-schedule-heading" className="text-xl font-bold text-[#111827]">ตารางสอนวันนี้</h2>
              <p className="mt-1 text-sm text-[#6B7280]">คาบเรียนทั้งหมดของคุณในวันนี้</p>
            </div>
            <Link
              href="/timetable"
              className="w-fit rounded-md text-sm font-semibold text-blue-700 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              ดูตารางทั้งหมด →
            </Link>
          </div>
          <ol className="mt-5 divide-y divide-slate-100">
            {todayLessons.map((lesson) => (
              <li key={`${lesson.time}-${lesson.className}`} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center">
                <div className="w-24 shrink-0">
                  <p className="text-sm font-bold text-[#111827]">{lesson.time}</p>
                  <p className="mt-0.5 text-xs text-[#6B7280]">ถึง {lesson.endTime}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#111827]">{lesson.className} · {lesson.subject}</p>
                  <p className="mt-1 text-sm text-[#6B7280]">{lesson.studentCount} คน · ห้อง {lesson.room}</p>
                </div>
                <StatusBadge variant={lesson.status === "เสร็จแล้ว" ? "success" : lesson.status === "คาบถัดไป" ? "info" : "neutral"}>
                  {lesson.status}
                </StatusBadge>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="tasks-heading">
          <h2 id="tasks-heading" className="text-xl font-bold text-[#111827]">ต้องจัดการ</h2>
          <p className="mt-1 text-sm text-[#6B7280]">งานที่ยังไม่เสร็จในวันนี้</p>
          <ul className="mt-5 space-y-3">
            {dashboardTasks.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] px-4 py-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  <span>
                    <span className="block text-sm font-semibold text-[#111827]">{task.title}</span>
                    <span className="mt-1 block text-xs text-[#6B7280]">{task.meta}</span>
                  </span>
                  <span className="shrink-0 text-lg text-slate-400" aria-hidden="true">›</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
