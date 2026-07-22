import { getDashboardOverview } from "@classroom-os/database";

import { AppShell } from "@/components/app-shell";
import { TodaySchedule } from "@/components/classroom/today-schedule";
import { ActionRequiredList } from "@/components/dashboard/action-required-list";
import { AttendanceDonutChart } from "@/components/dashboard/attendance-donut-chart";
import { AttendanceTrendChart } from "@/components/dashboard/attendance-trend-chart";
import { ClassroomComparisonChart } from "@/components/dashboard/classroom-comparison-chart";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { DashboardStatGrid } from "@/components/dashboard/dashboard-stat-grid";
import { NextClassCard } from "@/components/dashboard/next-class-card";
import { SessionStatusChart } from "@/components/dashboard/session-status-chart";
import { TeacherContextFilters } from "@/components/dashboard/teacher-context-filters";
import { PageHeader } from "@/components/page-header";
import { requireWebSession } from "@/lib/auth";
import { dashboardFiltersFromSearchParams } from "@/lib/dashboard";

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
  const overview = await getDashboardOverview({ schoolId: context.schoolId, auth: user.workspaceType === "PERSONAL" ? { ...context, role: "TEACHER" as const } : context, filters: dashboardFiltersFromSearchParams(toUrlSearchParams(query)) });
  const isTeacher = context.role === "TEACHER" || user.workspaceType === "PERSONAL";
  const dateLabel = new Intl.DateTimeFormat("th-TH", { dateStyle: "full", timeZone: overview.timezone }).format(new Date());

  return (
    <AppShell>
      <PageHeader
        eyebrow={`${dateLabel} · ${isTeacher ? "พื้นที่ทำงานของครู" : "พื้นที่บริหารโรงเรียน"}`}
        title={isTeacher ? `สวัสดีครับ ครู${user.firstName}` : "ภาพรวมโรงเรียน"}
        description={isTeacher ? "ภาพรวมการสอนของคุณวันนี้ ใช้ข้อมูลจากโปรไฟล์ครูและชั้นเรียนที่ได้รับมอบหมายเท่านั้น" : "ข้อมูลระดับโรงเรียนแยกตามครู ชั้นเรียน และรายวิชา โดยค่าเริ่มต้นเป็นภาพรวมทั้งโรงเรียน"}
      />

      <div className="mt-6">{isTeacher ? <TeacherContextFilters overview={overview} /> : <DashboardFilters overview={overview} />}</div>
      {!isTeacher ? (
        <p className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${overview.scope === "TEACHER_FILTERED" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-blue-200 bg-blue-50 text-blue-900"}`} role="status">
          {overview.scopeLabel}
        </p>
      ) : null}

      {isTeacher ? (
        <>
          <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <NextClassCard nextClass={overview.nextClass} liveSession={overview.liveSession} localDate={overview.localDate} />
            <TodaySchedule today={overview.today} />
          </div>
          <div className="mt-6"><DashboardStatGrid overview={overview} /></div>
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <DashboardCard title="การเข้าเรียนวันนี้" description="เฉพาะคาบและชั้นเรียนในบริบทการสอนของคุณ"><AttendanceDonutChart {...overview.attendance} /></DashboardCard>
            <DashboardCard title="เปรียบเทียบชั้นเรียนของฉัน" description="แต่ละชั้นเรียนและรายวิชาแสดงแยกกัน"><ClassroomComparisonChart classrooms={overview.classrooms} /></DashboardCard>
          </div>
          <div className="mt-6"><DashboardCard title="งานที่ต้องดำเนินการ" description="เรียงตามความเร่งด่วนในชั้นเรียนของคุณ"><ActionRequiredList actions={overview.actions} /></DashboardCard></div>
          <div className="mt-6"><DashboardCard title="แนวโน้มส่วนตัว 7 วัน" description={`ใช้เขตเวลาโรงเรียน ${overview.timezone}`}><AttendanceTrendChart points={overview.trend} /></DashboardCard></div>
        </>
      ) : (
        <>
          <div className="mt-6"><DashboardStatGrid overview={overview} /></div>
          <div className="mt-6 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <DashboardCard title={overview.scope === "SCHOOL" ? "การเข้าเรียนทั้งโรงเรียนวันนี้" : "การเข้าเรียนตามครูที่เลือก"} description={overview.scopeLabel}><AttendanceDonutChart {...overview.attendance} /></DashboardCard>
            <DashboardCard title={`แนวโน้ม ${overview.days} วัน`} description={`${overview.scopeLabel} · เขตเวลา ${overview.timezone}`}><AttendanceTrendChart points={overview.trend} /></DashboardCard>
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <DashboardCard title="เปรียบเทียบรายชั้นเรียน" description="แยกชั้นเรียน วิชา และผู้สอนด้วยบริบทงานสอน"><ClassroomComparisonChart classrooms={overview.classrooms} /></DashboardCard>
            <DashboardCard title="สถานะคาบวันนี้" description={overview.scopeLabel}><SessionStatusChart totals={overview.sessionStatus} /></DashboardCard>
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <DashboardCard title="งานที่ต้องดำเนินการ" description="คาบและการเข้าเรียนที่ควรตรวจสอบ"><ActionRequiredList actions={overview.actions} /></DashboardCard>
            <NextClassCard nextClass={overview.nextClass} liveSession={overview.liveSession} localDate={overview.localDate} />
          </div>
        </>
      )}
    </AppShell>
  );
}
