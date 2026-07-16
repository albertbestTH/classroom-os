import {
  getAttendanceReport,
  listClassrooms,
  listStaffUsers,
  listSubjects,
  listTeachingAssignments,
  listTerms,
} from "@classroom-os/database";
import type { AttendanceReportFilters, AttendanceStatusTotals } from "@classroom-os/types";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { requireWebSession } from "@/lib/auth";

type Search = Promise<Record<string, string | string[] | undefined>>;

const statusLabels: Record<keyof AttendanceStatusTotals, string> = {
  present: "มา",
  late: "สาย",
  absent: "ขาด",
  leave: "ลา",
  unrecorded: "ยังไม่บันทึก",
};

function stringValue(value: string | string[] | undefined) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function reportFilters(values: Awaited<Search>): AttendanceReportFilters {
  return {
    termId: stringValue(values.termId),
    classroomId: stringValue(values.classroomId),
    subjectId: stringValue(values.subjectId),
    teacherId: stringValue(values.teacherId),
    from: stringValue(values.from),
    to: stringValue(values.to),
  };
}

function reportQuery(filters: AttendanceReportFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  return params.toString();
}

function Totals({ totals }: { totals: AttendanceStatusTotals }) {
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
      {(Object.keys(statusLabels) as Array<keyof AttendanceStatusTotals>).map((key) => (
        <span key={key}>{statusLabels[key]} {totals[key]}</span>
      ))}
    </span>
  );
}

export default async function AttendancePage({ searchParams }: { searchParams: Search }) {
  const { context } = await requireWebSession();
  const filters = reportFilters(await searchParams);
  const report = await getAttendanceReport({
    schoolId: context.schoolId,
    auth: context,
    filters,
  });
  const terms = await listTerms({ schoolId: context.schoolId });
  const classrooms = await listClassrooms({
    schoolId: context.schoolId,
    isActive: true,
    ...(context.role === "TEACHER" && context.teacherId
      ? { teacherId: context.teacherId, termId: report.termId }
      : {}),
  });
  const allSubjects = await listSubjects({ schoolId: context.schoolId, isActive: true });
  const teacherAssignments = context.role === "TEACHER"
    ? await listTeachingAssignments({ auth: context })
    : [];
  const teacherSubjectIds = new Set(teacherAssignments.map(({ subjectId }) => subjectId));
  const subjects = context.role === "TEACHER"
    ? allSubjects.filter(({ id }) => teacherSubjectIds.has(id))
    : allSubjects;
  const staff = context.role === "TEACHER" ? [] : await listStaffUsers({ auth: context });
  const query = reportQuery(report.filters);

  return (
    <AppShell>
      <PageHeader
        eyebrow="รายงานการเข้าเรียน"
        title="ภาพรวมการเช็กชื่อ"
        description={`${report.scopeLabel} · เวลาตามเขต ${report.timezone}`}
        action={(
          <Link
            href={`/api/reports/attendance/export?${query}`}
            className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            ส่งออก CSV
          </Link>
        )}
      />

      <form className="mt-8 grid gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-6" aria-label="ตัวกรองรายงานการเข้าเรียน">
        <label className="text-sm font-semibold">ภาคเรียน<select name="termId" defaultValue={report.termId} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">{terms.map((term) => <option key={term.id} value={term.id}>{term.name} · {term.academicYearName}</option>)}</select></label>
        <label className="text-sm font-semibold">ชั้นเรียน<select name="classroomId" defaultValue={filters.classroomId ?? ""} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"><option value="">ทุกชั้นเรียน</option>{classrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}</select></label>
        <label className="text-sm font-semibold">วิชา<select name="subjectId" defaultValue={filters.subjectId ?? ""} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"><option value="">ทุกวิชา</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
        {context.role !== "TEACHER" ? <label className="text-sm font-semibold">ครูผู้สอน<select name="teacherId" defaultValue={filters.teacherId ?? ""} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"><option value="">ครูทุกคน</option>{staff.filter((user) => user.teacherId).map((user) => <option key={user.teacherId!} value={user.teacherId!}>{user.firstName} {user.lastName}</option>)}</select></label> : null}
        <label className="text-sm font-semibold">ตั้งแต่<input aria-label="วันที่เริ่มรายงาน" type="date" name="from" defaultValue={report.from} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" /></label>
        <label className="text-sm font-semibold">ถึง<input aria-label="วันที่สิ้นสุดรายงาน" type="date" name="to" defaultValue={report.to} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" /></label>
        <div className="flex items-end gap-2 xl:col-span-6"><button type="submit" className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">ใช้ตัวกรอง</button><Link href="/attendance" className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">ล้างตัวกรอง</Link></div>
      </form>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="สรุปรายงาน">
        <StatCard label="อัตราเข้าเรียน" value={`${report.attendancePercentage.toFixed(2)}%`} detail="นับมาและสายเทียบกับรายการที่ควรบันทึก" />
        <StatCard label="มา / สาย" value={`${report.totals.present} / ${report.totals.late}`} detail="สถานะที่นับว่าเข้าเรียน" />
        <StatCard label="ขาด / ลา" value={`${report.totals.absent} / ${report.totals.leave}`} detail="แยกสถานะเพื่อการติดตาม" />
        <StatCard label="ยังไม่บันทึก" value={String(report.totals.unrecorded)} detail="คาบที่ถึงเวลาแล้ว แต่ข้อมูลยังไม่ครบ" />
      </section>

      <section className="mt-8 rounded-2xl border border-[#E5E7EB] bg-white shadow-sm" aria-labelledby="student-report-heading">
        <div className="p-5"><h2 id="student-report-heading" className="text-xl font-bold">รายนักเรียน</h2><p className="mt-1 text-sm text-[#6B7280]">นักเรียนคนเดียวกันจะแยกตามชั้นเรียนและวิชาเสมอ</p></div>
        <div className="overflow-x-auto"><table className="min-w-[920px] w-full border-collapse text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-5 py-3">นักเรียน</th><th className="px-5 py-3">ชั้นเรียน</th><th className="px-5 py-3">วิชา</th><th className="px-5 py-3">คาบ</th><th className="px-5 py-3">สถานะ</th><th className="px-5 py-3 text-right">เข้าเรียน</th></tr></thead><tbody className="divide-y divide-slate-100">{report.students.map((student) => <tr key={`${student.studentId}-${student.classroomId}-${student.subjectId}`}><td className="px-5 py-4"><Link href={`/api/reports/attendance/students/${student.studentId}?${query}`} className="font-semibold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">{student.studentName}</Link><p className="mt-1 font-mono text-xs text-slate-500">{student.studentNumber}</p></td><td className="px-5 py-4">{student.classroomName}</td><td className="px-5 py-4">{student.subjectName}</td><td className="px-5 py-4">{student.sessionCount}</td><td className="px-5 py-4"><Totals totals={student.totals} /></td><td className="px-5 py-4 text-right font-bold">{student.attendancePercentage.toFixed(2)}%</td></tr>)}</tbody></table>{report.students.length === 0 ? <p className="px-5 py-10 text-center text-sm text-slate-500">ไม่พบข้อมูลตามตัวกรองนี้</p> : null}</div>
      </section>

      <section className="mt-8 rounded-2xl border border-[#E5E7EB] bg-white shadow-sm" aria-labelledby="session-report-heading">
        <div className="p-5"><h2 id="session-report-heading" className="text-xl font-bold">รายคาบเรียน</h2></div>
        <div className="overflow-x-auto"><table className="min-w-[900px] w-full border-collapse text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-5 py-3">วันและเวลา</th><th className="px-5 py-3">ชั้นเรียน / วิชา</th><th className="px-5 py-3">ครู</th><th className="px-5 py-3">สถานะคาบ</th><th className="px-5 py-3">ความครบถ้วน</th><th className="px-5 py-3 text-right">เข้าเรียน</th></tr></thead><tbody className="divide-y divide-slate-100">{report.sessions.map((session) => <tr key={session.sessionId}><td className="px-5 py-4"><Link href={`/sessions/${session.sessionId}/summary`} className="font-semibold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">{new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: report.timezone }).format(new Date(session.scheduledStart))}</Link></td><td className="px-5 py-4">{session.classroomName}<p className="mt-1 text-xs text-slate-500">{session.subjectName}</p></td><td className="px-5 py-4">{session.teacherName}</td><td className="px-5 py-4"><StatusBadge variant={session.status === "completed" ? "success" : session.status === "cancelled" ? "warning" : session.status === "live" ? "info" : "neutral"}>{session.status}</StatusBadge></td><td className="px-5 py-4">{session.recordedCount}/{session.enrolledCount}</td><td className="px-5 py-4 text-right font-bold">{session.attendancePercentage.toFixed(2)}%</td></tr>)}</tbody></table></div>
      </section>
    </AppShell>
  );
}
