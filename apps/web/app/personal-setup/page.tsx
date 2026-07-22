import { getStaffUser, listAcademicYears, listClassrooms, listSubjects, listTeachingAssignments, listTerms } from "@classroom-os/database";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AssignmentManager } from "@/components/admin/assignment-manager";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { requireWebSession } from "@/lib/auth";

export default async function PersonalSetupPage() {
  const { context, user } = await requireWebSession();
  if (user.workspaceType !== "PERSONAL" || !context.teacherId) redirect("/");
  const [staff, academicYears, terms, classrooms, subjects, assignments] = await Promise.all([
    getStaffUser({ auth: context, userId: context.userId }),
    listAcademicYears({ schoolId: context.schoolId }), listTerms({ schoolId: context.schoolId }),
    listClassrooms({ schoolId: context.schoolId }), listSubjects({ schoolId: context.schoolId }),
    listTeachingAssignments({ auth: context, userId: context.userId }),
  ]);
  const ready = academicYears.length > 0 && terms.length > 0 && classrooms.length > 0 && subjects.length > 0;
  return <AppShell><PageHeader eyebrow="พื้นที่สอนส่วนตัว" title="ตั้งค่างานสอนของฉัน" description="เชื่อมห้อง รายวิชา และภาคเรียนให้เป็นขอบเขตงานสอนที่ใช้ร่วมกันบนเว็บและแอป" />
    {!ready ? <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-bold text-amber-950">เตรียมข้อมูลพื้นฐานก่อน</h2><p className="mt-2 text-sm text-amber-900">สร้างปีและภาคเรียน ห้องเรียน และรายวิชา แล้วกลับมาเพิ่มงานสอน</p><div className="mt-4 flex flex-wrap gap-3"><Link className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-blue-700" href="/academic-years">ปีการศึกษา</Link><Link className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-blue-700" href="/classrooms">ห้องเรียน</Link><Link className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-blue-700" href="/subjects">รายวิชา</Link></div></section> : <AssignmentManager staffId={context.userId} teachers={[staff]} academicYears={academicYears} terms={terms} classrooms={classrooms} subjects={subjects} assignments={assignments} />}
  </AppShell>;
}
