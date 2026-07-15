import { getStaffUser, listTeachingAssignments } from "@classroom-os/database";
import type { UserRole } from "@classroom-os/types";
import Link from "next/link";

import { StaffAccountActions } from "@/components/admin/staff-account-actions";
import { TeacherProfileForm } from "@/components/admin/teacher-profile-form";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { requireAdminWebSession } from "@/lib/auth";

const roleLabels: Record<UserRole, string> = { SCHOOL_OWNER: "เจ้าของโรงเรียน", ADMIN: "ผู้ดูแลระบบ", TEACHER: "ครูผู้สอน" };

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const session = await requireAdminWebSession();
  const [staff, assignments] = await Promise.all([getStaffUser({ auth: session.context, userId: id }), listTeachingAssignments({ auth: session.context, userId: id })]);
  const lastLogin = staff.lastLoginAt ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(staff.lastLoginAt)) : "ยังไม่เคยเข้าสู่ระบบ";
  const canManage = session.context.role === "SCHOOL_OWNER" || staff.role !== "SCHOOL_OWNER";
  return <AppShell><PageHeader eyebrow="บุคลากร" title={`${staff.firstName} ${staff.lastName}`} description={staff.email} action={<Link href="/staff" className="inline-flex min-h-11 items-center rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-blue-600">← รายชื่อบุคลากร</Link>} />
    <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"><section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm" aria-labelledby="account-heading"><h2 id="account-heading" className="text-lg font-bold">ข้อมูลบัญชี</h2><dl className="mt-5 grid gap-5 sm:grid-cols-2"><div><dt className="text-sm text-[#6B7280]">ชื่อ</dt><dd className="mt-1 font-semibold">{staff.firstName} {staff.lastName}</dd></div><div><dt className="text-sm text-[#6B7280]">อีเมล</dt><dd className="mt-1">{staff.email}</dd></div><div><dt className="text-sm text-[#6B7280]">บทบาท</dt><dd className="mt-1">{roleLabels[staff.role]}</dd></div><div><dt className="text-sm text-[#6B7280]">สถานะ</dt><dd className="mt-1"><StatusBadge variant={staff.status === "ACTIVE" ? "success" : "warning"}>{staff.status === "ACTIVE" ? "ใช้งาน" : "ปิดใช้งาน"}</StatusBadge></dd></div><div><dt className="text-sm text-[#6B7280]">เข้าสู่ระบบล่าสุด</dt><dd className="mt-1">{lastLogin}</dd></div><div><dt className="text-sm text-[#6B7280]">งานสอน</dt><dd className="mt-1">{assignments.length} รายการ</dd></div></dl></section>
    <aside className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm" aria-labelledby="status-actions-heading"><h2 id="status-actions-heading" className="text-lg font-bold">จัดการสถานะ</h2><p className="mt-2 text-sm text-[#6B7280]">การปิดบัญชีจะยกเลิกเซสชันที่ใช้งานอยู่ทั้งหมด</p><div className="mt-5"><StaffAccountActions staff={staff} currentUserId={session.context.userId} canManage={canManage} /></div></aside></div>
    {staff.role === "TEACHER" ? <section className="mt-6 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm" aria-labelledby="teacher-profile-heading"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 id="teacher-profile-heading" className="text-lg font-bold">โปรไฟล์ครู</h2><p className="mt-1 text-sm text-[#6B7280]">{staff.teacherId ? `รหัสบุคลากร ${staff.employeeCode}` : "ต้องมีโปรไฟล์ครูก่อนเพิ่มงานสอน"}</p></div>{staff.teacherId ? <Link href={`/staff/${staff.id}/assignments`} className="inline-flex min-h-11 items-center rounded-xl border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600">ดูและเพิ่มงานสอน</Link> : null}</div>{!staff.teacherId ? <TeacherProfileForm userId={staff.id} /> : null}</section> : null}
  </AppShell>;
}
