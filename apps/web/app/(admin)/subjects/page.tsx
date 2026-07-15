import { listSubjects } from "@classroom-os/database";
import Link from "next/link";

import { SubjectManager } from "@/components/admin/subject-manager";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { requireAdminWebSession } from "@/lib/auth";

export default async function SubjectsPage() {
  const { context } = await requireAdminWebSession();
  const subjects = await listSubjects({ schoolId: context.schoolId });
  return <AppShell><PageHeader eyebrow="โครงสร้างโรงเรียน" title="รายวิชา" description="จัดการรหัส ชื่อ และสถานะของรายวิชาภายในโรงเรียน" action={<Link href="/academic-years" className="inline-flex min-h-11 items-center rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-blue-600">ปีการศึกษาและภาคเรียน</Link>} /><SubjectManager subjects={subjects} /></AppShell>;
}
