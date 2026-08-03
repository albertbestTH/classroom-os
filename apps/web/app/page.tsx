import { getDashboardOverview } from "@classroom-os/database";
import Image from "next/image";

import { AppShell } from "@/components/app-shell";
import { TodaySchedule } from "@/components/classroom/today-schedule";
import { ActionRequiredList } from "@/components/dashboard/action-required-list";
import { AttendanceDonutChart } from "@/components/dashboard/attendance-donut-chart";
import { AttendanceScopeSelect } from "@/components/dashboard/attendance-scope-select";
import { AttendanceTrendChart } from "@/components/dashboard/attendance-trend-chart";
import { ClassroomComparisonChart } from "@/components/dashboard/classroom-comparison-chart";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { DashboardStatGrid } from "@/components/dashboard/dashboard-stat-grid";
import { NextClassCard } from "@/components/dashboard/next-class-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { SessionStatusChart } from "@/components/dashboard/session-status-chart";
import { TeacherContextFilters } from "@/components/dashboard/teacher-context-filters";
import { OperationalFreshness } from "@/components/operational-freshness";
import { PageHeader } from "@/components/page-header";
import { requireWebSession } from "@/lib/auth";
import { dashboardFiltersFromSearchParams } from "@/lib/dashboard";
import { todayNeedsPolling } from "@/lib/operational-freshness-policy";

type DashboardPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function toUrlSearchParams(values: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value !== undefined) params.set(key, value);
  }
  return params;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const [{ context, user }, query] = await Promise.all([requireWebSession(), searchParams]);
  const overview = await getDashboardOverview({
    schoolId: context.schoolId,
    auth: user.workspaceType === "PERSONAL" ? { ...context, role: "TEACHER" as const } : context,
    filters: dashboardFiltersFromSearchParams(toUrlSearchParams(query)),
  });
  const trendsOverview = overview.filters.classroomId
    ? await getDashboardOverview({
      schoolId: context.schoolId,
      auth: user.workspaceType === "PERSONAL" ? { ...context, role: "TEACHER" as const } : context,
      filters: { days: overview.days },
    })
    : overview;
  const isTeacher = context.role === "TEACHER" || user.workspaceType === "PERSONAL";
  const dateLabel = new Intl.DateTimeFormat("th-TH", { dateStyle: "full", timeZone: overview.timezone }).format(new Date());

  return (
    <AppShell>
      <OperationalFreshness poll={todayNeedsPolling(overview.today, new Date().getTime())} />
      <PageHeader
        eyebrow={isTeacher ? "สวัสดีตอนเช้า" : dateLabel}
        title={isTeacher ? `ครู${user.firstName} ${user.lastName}` : "ภาพรวมโรงเรียน"}
        description={dateLabel}
        action={<div className="flex items-center gap-4"><button type="button" aria-label="การแจ้งเตือน" className="relative rounded-full p-2 text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg><span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">3</span></button><span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-sm font-bold text-blue-700">{user.profileImageKey ? <Image src={user.profileImageKey} alt={`รูปโปรไฟล์ของ ${user.firstName} ${user.lastName}`} width={44} height={44} className="h-full w-full object-cover" /> : user.firstName.slice(0, 1)}</span><span className="text-slate-500" aria-hidden="true">⌄</span></div>}
      />

      {!isTeacher ? <details className="mt-3 text-right">
        <summary className="inline-flex cursor-pointer list-none text-xs font-semibold text-slate-500 hover:text-blue-700">ตัวกรองชั้นเรียน</summary>
        <div className="mt-2 text-left">{isTeacher ? <TeacherContextFilters overview={overview} /> : <DashboardFilters overview={overview} />}</div>
      </details> : null}
      {!isTeacher ? (
        <p className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${overview.scope === "TEACHER_FILTERED" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-blue-200 bg-blue-50 text-blue-900"}`} role="status">
          {overview.scopeLabel}
        </p>
      ) : null}

      {isTeacher ? (
        <div className="teacher-dashboard-grid mt-7" aria-label="Teacher dashboard">
          <div className="teacher-dashboard-left-column">
            <div className="teacher-dashboard-hero"><NextClassCard nextClass={overview.nextClass} liveSession={overview.liveSession} localDate={overview.localDate} /></div>
            <div className="teacher-dashboard-schedule"><TodaySchedule today={overview.today} /></div>
            <div className="teacher-dashboard-trends"><DashboardCard title="ห้องเรียนและแนวโน้มการเข้าเรียน" description="ข้อมูลจากชั้นเรียนที่คุณรับผิดชอบ"><ClassroomComparisonChart classrooms={trendsOverview.classrooms} /></DashboardCard></div>
          </div>
          <div className="teacher-dashboard-right-column">
            <div className="teacher-dashboard-actions"><DashboardCard title="ทางลัด"><QuickActions attendanceClass={overview.liveSession ?? overview.nextClass} /></DashboardCard></div>
            <div className="teacher-dashboard-attendance"><DashboardCard title="ภาพรวมการเข้าเรียนวันนี้" description="สถานะการเข้าเรียนวันนี้" headerAction={<AttendanceScopeSelect options={overview.filterOptions.classrooms} value={overview.filters.classroomId} />}><AttendanceDonutChart {...overview.attendance} /></DashboardCard></div>
            <div className="teacher-dashboard-pending"><DashboardCard title="งานที่ต้องติดตาม" description="รายการที่ควรติดตามต่อ"><ActionRequiredList actions={overview.actions.slice(0, 5)} /></DashboardCard></div>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6"><DashboardStatGrid overview={overview} /></div>
          <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
            <DashboardCard title={overview.scope === "SCHOOL" ? "การเข้าเรียนทั้งโรงเรียน" : "การเข้าเรียนตามครูที่เลือก"} description={overview.scopeLabel}>
              <AttendanceDonutChart {...overview.attendance} />
            </DashboardCard>
            <DashboardCard title={`แนวโน้ม ${overview.days} วัน`} description={`${overview.scopeLabel} · เขตเวลา ${overview.timezone}`}>
              <AttendanceTrendChart points={overview.trend} />
            </DashboardCard>
          </section>
          <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
            <DashboardCard title="เปรียบเทียบรายห้องเรียน" description="แยกชั้นเรียน วิชา และผู้สอนตามบริบทงาน">
              <ClassroomComparisonChart classrooms={overview.classrooms} />
            </DashboardCard>
            <DashboardCard title="สถานะคาบเรียนวันนี้" description={overview.scopeLabel}>
              <SessionStatusChart totals={overview.sessionStatus} />
            </DashboardCard>
          </section>
          <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
            <DashboardCard title="งานที่ต้องดำเนินการ" description="คาบและการเช็กชื่อที่ควรตรวจสอบ">
              <ActionRequiredList actions={overview.actions} />
            </DashboardCard>
            <NextClassCard nextClass={overview.nextClass} liveSession={overview.liveSession} localDate={overview.localDate} />
          </section>
        </>
      )}
    </AppShell>
  );
}
