import { getClassSession, getSessionAttendanceRoster, listClassSessionTimeline, requireClassSessionAccess } from "@classroom-os/database";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { AttendanceDashboard } from "@/components/classroom/attendance-dashboard";
import { SessionTimeline } from "@/components/classroom/session-timeline";
import { PageHeader } from "@/components/page-header";
import { summarizeAttendance } from "@/lib/attendance-summary";
import { requireWebSession } from "@/lib/auth";

export default async function SessionSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { context } = await requireWebSession();
  await requireClassSessionAccess(context, id);
  const [session, roster, timeline] = await Promise.all([getClassSession({ schoolId: context.schoolId, sessionId: id }), getSessionAttendanceRoster({ schoolId: context.schoolId, sessionId: id }), listClassSessionTimeline({ schoolId: context.schoolId, sessionId: id })]);
  return <AppShell><PageHeader eyebrow="สรุปคาบเรียน" title={`${session.subjectName} · ${session.classroomName}`} description={`${session.termName} · ${session.teacherName}`} action={<Link href={`/sessions/${id}`} aria-label="กลับไปหน้าคาบเรียน" className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">← กลับไปหน้าคาบเรียน</Link>} /><div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]"><AttendanceDashboard summary={summarizeAttendance(roster)} /><SessionTimeline events={timeline} /></div></AppShell>;
}
