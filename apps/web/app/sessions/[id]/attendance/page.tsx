import { getClassSession, getSessionAttendanceRoster, requireAttendanceAccess } from "@classroom-os/database";

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
  return <AppShell><PageHeader eyebrow={`${session.subjectName} · ${session.classroomName}`} title="เช็กชื่อนักเรียน" description={`เฉพาะนักเรียนที่ลงทะเบียนใน ${session.classroomName} ภาคเรียน ${session.termName}`} /><AttendanceEditor initial={roster} canCorrect={context.role !== "TEACHER"} /></AppShell>;
}
