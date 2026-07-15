import { getStaffUser, listAcademicYears, listClassrooms, listStaffUsers, listSubjects, listTeachingAssignments, listTerms } from "@classroom-os/database";
import Link from "next/link";

import { AssignmentManager } from "@/components/admin/assignment-manager";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { requireAdminWebSession } from "@/lib/auth";

export default async function StaffAssignmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { context } = await requireAdminWebSession();
  const [staff, allStaff, academicYears, terms, classrooms, subjects, assignments] = await Promise.all([getStaffUser({ auth: context, userId: id }), listStaffUsers({ auth: context }), listAcademicYears({ schoolId: context.schoolId }), listTerms({ schoolId: context.schoolId }), listClassrooms({ schoolId: context.schoolId }), listSubjects({ schoolId: context.schoolId }), listTeachingAssignments({ auth: context, userId: id })]);
  const teachers = allStaff.filter((item) => item.role === "TEACHER" && item.teacherId && item.status === "ACTIVE");
  return <AppShell><PageHeader eyebrow="งานสอน" title={`${staff.firstName} ${staff.lastName}`} description="แต่ละห้องเรียนและรายวิชาเป็นขอบเขตงานสอนที่แยกจากกัน" action={<Link href={`/staff/${id}`} className="inline-flex min-h-11 items-center rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-blue-600">← รายละเอียดบุคลากร</Link>} />{staff.teacherId ? <AssignmentManager staffId={id} teachers={teachers} academicYears={academicYears} terms={terms} classrooms={classrooms} subjects={subjects} assignments={assignments} /> : <p className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">ต้องสร้างโปรไฟล์ครูก่อนเพิ่มงานสอน</p>}</AppShell>;
}
