import { getTodayTimetable } from "@classroom-os/database";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { StartClassButton } from "@/components/classroom/start-class-button";
import { PageHeader } from "@/components/page-header";
import { requireWebSession } from "@/lib/auth";

export default async function LivePage() {
  const { context } = await requireWebSession();
  const today = await getTodayTimetable({ schoolId: context.schoolId, role: context.role, teacherId: context.teacherId });
  const live = today.classes.find((item) => item.status === "live" && item.session);
  if (live?.session) redirect(`/sessions/${live.session.id}`);
  return <AppShell><PageHeader eyebrow="Live Class" title="คาบเรียนของฉัน" description="เริ่มคาบถัดไปหรือกลับมาที่นี่เมื่อมีคาบกำลังสอน" /><section className="mt-8 max-w-xl rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">{today.nextClass ? <><h2 className="text-xl font-bold">{today.nextClass.timetableEntry.subjectName}</h2><p className="mt-2 text-[#6B7280]">{today.nextClass.timetableEntry.classroomName} · {today.nextClass.timetableEntry.startTime}–{today.nextClass.timetableEntry.endTime}</p><div className="mt-6"><StartClassButton item={today.nextClass} localDate={today.localDate} /></div></> : <><h2 className="text-xl font-bold">ไม่มีคาบที่กำลังสอน</h2><p className="mt-2 text-[#6B7280]">วันนี้ไม่มีคาบถัดไปที่ต้องเริ่ม</p></>}</section></AppShell>;
}
