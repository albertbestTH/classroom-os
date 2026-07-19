import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { getSchoolProfile } from "@classroom-os/database";
import { requireAdminWebSession } from "@/lib/auth";
import { SchoolProfileForm } from "./school-profile-form";

export default async function SettingsPage() {
  const { context } = await requireAdminWebSession();
  const profile = await getSchoolProfile(context);
  return <AppShell><PageHeader eyebrow="การบริหารโรงเรียน" title="ตั้งค่า" description="จัดการข้อมูลทั่วไปและโครงสร้างการศึกษาของโรงเรียน" /><SchoolProfileForm initialProfile={profile} /><div className="mt-6 grid gap-4 sm:grid-cols-2"><Link href="/academic-years" className="rounded-2xl border border-[#E5E7EB] bg-white p-5 font-semibold shadow-sm focus-visible:ring-2 focus-visible:ring-blue-600">ปีการศึกษาและภาคเรียน</Link><Link href="/subjects" className="rounded-2xl border border-[#E5E7EB] bg-white p-5 font-semibold shadow-sm focus-visible:ring-2 focus-visible:ring-blue-600">รายวิชา</Link></div></AppShell>;
}
