import { getClassSession, getSessionAttendanceRoster, listClassSessionTimeline, requireClassSessionAccess } from "@classroom-os/database";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { SessionTimeline } from "@/components/classroom/session-timeline";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { requireWebSession } from "@/lib/auth";

export default async function SessionSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { context } = await requireWebSession();
  await requireClassSessionAccess(context, id);
  const [session, roster, timeline] = await Promise.all([getClassSession({ schoolId: context.schoolId, sessionId: id }), getSessionAttendanceRoster({ schoolId: context.schoolId, sessionId: id }), listClassSessionTimeline({ schoolId: context.schoolId, sessionId: id })]);
  const count = (status: string) => roster.students.filter((item) => item.status === status).length;
  return <AppShell><PageHeader eyebrow="สรุปคาบเรียน" title={`${session.subjectName} · ${session.classroomName}`} description={`${session.termName} · ${session.teacherName}`} action={<Link href={`/sessions/${id}`} className="inline-flex min-h-11 items-center rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">กลับไปหน้าคาบเรียน</Link>} /><section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="สรุปการเข้าเรียน"><StatCard label="ลงทะเบียน" value={String(roster.enrolledCount)} /><StatCard label="มา" value={String(count("present"))} /><StatCard label="สาย" value={String(count("late"))} /><StatCard label="ขาด" value={String(count("absent"))} /><StatCard label="ลา" value={String(count("leave"))} /></section><div className="mt-6"><SessionTimeline events={timeline} /></div></AppShell>;
}
