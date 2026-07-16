import { getClassSession, listClassSessionTimeline, requireClassSessionAccess } from "@classroom-os/database";

import { AppShell } from "@/components/app-shell";
import { LiveSessionControls } from "@/components/classroom/live-session-controls";
import { SessionTimeline } from "@/components/classroom/session-timeline";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { requireWebSession } from "@/lib/auth";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { context } = await requireWebSession();
  await requireClassSessionAccess(context, id);
  const [session, timeline] = await Promise.all([
    getClassSession({ schoolId: context.schoolId, sessionId: id }),
    listClassSessionTimeline({ schoolId: context.schoolId, sessionId: id }),
  ]);
  const statusLabel = session.status === "live" ? "LIVE · กำลังสอน" : session.status === "completed" ? "จบคาบแล้ว" : session.status === "cancelled" ? "ยกเลิกแล้ว" : "รอเริ่ม";
  return <AppShell><PageHeader eyebrow={`${session.termName} · ${session.academicYearName}`} title={`${session.subjectName} · ${session.classroomName}`} description={`${session.teacherName} · ${new Intl.DateTimeFormat("th-TH", { timeStyle: "short" }).format(new Date(session.scheduledStart))}–${new Intl.DateTimeFormat("th-TH", { timeStyle: "short" }).format(new Date(session.scheduledEnd))}`} action={<StatusBadge variant={session.status === "live" ? "info" : session.status === "completed" ? "success" : session.status === "cancelled" ? "warning" : "neutral"}>{statusLabel}</StatusBadge>} /><div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]"><div className="space-y-6"><LiveSessionControls session={session} role={context.role} /><section className="grid gap-4 sm:grid-cols-2"><article className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm"><p className="text-sm text-[#6B7280]">นักเรียนที่ลงทะเบียน</p><p className="mt-2 text-3xl font-bold">{session.enrolledStudentCount}</p></article><article className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm"><p className="text-sm text-[#6B7280]">เช็กชื่อแล้ว</p><p className="mt-2 text-3xl font-bold">{session.attendanceRecordedCount}<span className="text-base font-medium text-[#6B7280]">/{session.enrolledStudentCount}</span></p></article></section></div><SessionTimeline events={timeline} /></div></AppShell>;
}
