import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { requireAdminWebSession } from "@/lib/auth";

export default async function ReportsPage() {
  await requireAdminWebSession();
  return <AppShell><PageHeader eyebrow="การวิเคราะห์" title="รายงาน" description="ศูนย์รวมรายงานโรงเรียนกำลังอยู่ในแผนการพัฒนาถัดไป" /><div className="mt-8 rounded-2xl border border-[#E5E7EB] bg-white p-8 text-center text-sm text-[#6B7280] shadow-sm" role="status">รายงานเชิงลึกจะพร้อมใช้งานในสปรินต์ถัดไป</div></AppShell>;
}
