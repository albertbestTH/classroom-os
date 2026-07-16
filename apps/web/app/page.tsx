import { getDashboardOverview } from "@classroom-os/database";

import { AppShell } from "@/components/app-shell";
import { TodaySchedule } from "@/components/classroom/today-schedule";
import { ActionRequiredList } from "@/components/dashboard/action-required-list";
import { AttendanceDonutChart } from "@/components/dashboard/attendance-donut-chart";
import { AttendanceTrendChart } from "@/components/dashboard/attendance-trend-chart";
import { ClassroomComparisonChart } from "@/components/dashboard/classroom-comparison-chart";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { NextClassCard } from "@/components/dashboard/next-class-card";
import { SessionStatusChart } from "@/components/dashboard/session-status-chart";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { requireWebSession } from "@/lib/auth";
import { dashboardFiltersFromSearchParams } from "@/lib/dashboard";

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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
    auth: context,
    filters: dashboardFiltersFromSearchParams(toUrlSearchParams(query)),
  });
  const isTeacher = context.role === "TEACHER";
  const dateLabel = new Intl.DateTimeFormat("th-TH", {
    dateStyle: "full",
    timeZone: overview.timezone,
  }).format(new Date());

  return (
    <AppShell>
      <PageHeader
        eyebrow={`${dateLabel} · ${overview.scopeLabel}`}
        title={`สวัสดีครับ ${user.firstName}`}
        description={isTeacher ? "คาบเรียน การเช็กชื่อ และสิ่งที่ต้องจัดการสำหรับชั้นเรียนที่คุณได้รับมอบหมาย" : "ข้อมูลทั้งโรงเรียนจะแสดงอย่างชัดเจนและแยกตามชั้นเรียนกับรายวิชา"}
      />

      {!isTeacher ? <div className="mt-6"><DashboardFilters overview={overview} /></div> : null}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="ตัวเลขสำคัญวันนี้">
        <StatCard label="อัตราเข้าเรียนวันนี้" value={`${overview.attendance.attendancePercentage}%`} detail={`มาเรียนหรือมาสาย ${overview.attendance.attendedCount}/${overview.attendance.eligibleCount} รายการ`} />
        <StatCard label="บันทึกการเข้าเรียนครบ" value={`${overview.attendance.completionPercentage}%`} detail={`บันทึกแล้ว ${overview.attendance.recordedCount}/${overview.attendance.eligibleCount} รายการ`} />
        <StatCard label="คาบกำลังสอน" value={String(overview.sessionStatus.live)} detail={`เสร็จแล้ว ${overview.sessionStatus.completed} · รอเริ่ม ${overview.sessionStatus.scheduled}`} />
        <StatCard label="ต้องติดตาม" value={String(overview.actions.length)} detail={`เลยเวลา ${overview.sessionStatus.missed} · เช็กชื่อไม่ครบ ${overview.sessionStatus.attendanceIncomplete}`} />
      </section>

      {isTeacher ? (
        <>
          <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <NextClassCard nextClass={overview.nextClass} liveSession={overview.liveSession} localDate={overview.localDate} />
            <DashboardCard title="งานที่ต้องดำเนินการ" description="เรียงตามความเร่งด่วนในชั้นเรียนที่ได้รับมอบหมาย"><ActionRequiredList actions={overview.actions} /></DashboardCard>
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <DashboardCard title="การเข้าเรียนวันนี้" description="นับเฉพาะคาบที่ถึงเวลาในชั้นเรียนที่ได้รับมอบหมาย"><AttendanceDonutChart {...overview.attendance} /></DashboardCard>
            <TodaySchedule today={overview.today} />
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <DashboardCard title="แนวโน้ม 7 วัน" description={`ใช้เขตเวลาโรงเรียน ${overview.timezone}`}><AttendanceTrendChart points={overview.trend} /></DashboardCard>
            <DashboardCard title="เปรียบเทียบชั้นเรียนที่รับผิดชอบ" description="ชั้นเรียนและวิชาเดียวกันจะไม่ถูกรวมข้ามห้อง"><ClassroomComparisonChart classrooms={overview.classrooms} /></DashboardCard>
          </div>
        </>
      ) : (
        <>
          <div className="mt-6 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <DashboardCard title="การเข้าเรียนทั้งโรงเรียนวันนี้" description="ภาพรวมทั้งโรงเรียนตามตัวกรองที่เลือก"><AttendanceDonutChart {...overview.attendance} /></DashboardCard>
            <DashboardCard title={`แนวโน้ม ${overview.days} วัน`} description={`ข้อมูลทั้งโรงเรียน · เขตเวลา ${overview.timezone}`}><AttendanceTrendChart points={overview.trend} /></DashboardCard>
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <DashboardCard title="เปรียบเทียบรายชั้นเรียน" description="แยกชั้นเรียน วิชา และผู้สอนด้วยรหัสจริง"><ClassroomComparisonChart classrooms={overview.classrooms} /></DashboardCard>
            <DashboardCard title="สถานะคาบวันนี้" description="ข้อมูลปฏิบัติการทั้งโรงเรียนตามขอบเขตที่เลือก"><SessionStatusChart totals={overview.sessionStatus} /></DashboardCard>
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
