import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { requireWebSession } from "@/lib/auth";

export default async function AttendancePage() {
  await requireWebSession();
  return <AppShell><PageHeader eyebrow="คาบเรียน" title="เช็กชื่อ" description="เลือกคาบเรียนสดจากหน้าภาพรวมเพื่อบันทึกการเข้าเรียน" /><div className="mt-8 rounded-2xl border border-[#E5E7EB] bg-white p-8 text-center text-sm text-[#6B7280] shadow-sm" role="status">เริ่มคาบเรียนเพื่อเปิดรายชื่อนักเรียนสำหรับเช็กชื่อ</div></AppShell>;
}
