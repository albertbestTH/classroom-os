import { listStaffUsers } from "@classroom-os/database";
import Link from "next/link";

import { StaffDirectory } from "@/components/admin/staff-directory";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { requireAdminWebSession } from "@/lib/auth";

export default async function StaffPage() {
  const { context } = await requireAdminWebSession();
  const staff = await listStaffUsers({ auth: context });
  return <AppShell><PageHeader eyebrow="การจัดการบัญชี" title="บุคลากร" description="จัดการบัญชี โปรไฟล์ครู และงานสอนภายในโรงเรียน" action={<Link href="/staff/new" className="inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">+ เพิ่มบุคลากร</Link>} /><StaffDirectory page={{ items: staff, nextCursor: null }} /></AppShell>;
}
