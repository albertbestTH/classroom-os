import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { requireOwnerWebSession } from "@/lib/auth";

export default async function SettingsPage() {
  await requireOwnerWebSession();
  return <AppShell><PageHeader eyebrow="เจ้าของโรงเรียน" title="ตั้งค่า" description="จัดการโครงสร้างและปฏิทินการศึกษาของโรงเรียน" /><div className="mt-8 grid gap-4 sm:grid-cols-2"><Link href="/academic-years" className="rounded-2xl border border-[#E5E7EB] bg-white p-5 font-semibold shadow-sm focus-visible:ring-2 focus-visible:ring-blue-600">ปีการศึกษาและภาคเรียน</Link><Link href="/subjects" className="rounded-2xl border border-[#E5E7EB] bg-white p-5 font-semibold shadow-sm focus-visible:ring-2 focus-visible:ring-blue-600">รายวิชา</Link></div></AppShell>;
}
