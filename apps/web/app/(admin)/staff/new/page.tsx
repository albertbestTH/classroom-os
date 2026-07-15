import Link from "next/link";

import { CreateStaffForm } from "@/components/admin/create-staff-form";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";

export default function NewStaffPage() {
  return <AppShell><PageHeader eyebrow="บุคลากร" title="สร้างบัญชีบุคลากร" description="สร้างบัญชีผู้ดูแลระบบหรือครูด้วยรหัสผ่านชั่วคราว" action={<Link href="/staff" className="inline-flex min-h-11 items-center rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#111827] focus-visible:ring-2 focus-visible:ring-blue-600">← กลับไปรายชื่อ</Link>} /><CreateStaffForm /></AppShell>;
}
