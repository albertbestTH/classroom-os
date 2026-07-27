import { getClassSession, getSessionAttendanceRoster, requireAttendanceAccess } from "@classroom-os/database";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { AttendanceEditor } from "@/components/classroom/attendance-editor";
import { PageHeader } from "@/components/page-header";
import { requireWebSession } from "@/lib/auth";

export default async function AttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { context } = await requireWebSession();
  await requireAttendanceAccess(context, id);
  const [session, roster] = await Promise.all([
    getClassSession({ schoolId: context.schoolId, sessionId: id }),
    getSessionAttendanceRoster({ schoolId: context.schoolId, sessionId: id }),
  ]);
  return <AppShell><PageHeader eyebrow={`${session.subjectName} · ${session.classroomName}`} title="เช็กชื่อนักเรียน" description={`${session.classroomName} · ${session.termName}`} action={<Link href={`/sessions/${id}`} aria-label="กลับไปหน้าคาบเรียน" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">← กลับไปหน้าคาบเรียน</Link>} /><AttendanceEditor initial={roster} canCorrect={context.role !== "TEACHER"} /></AppShell>;
}
