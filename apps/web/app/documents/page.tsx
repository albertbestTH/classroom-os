import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { WorkspacePlaceholder } from "@/components/workspace-placeholder";
import { requireWebSession } from "@/lib/auth";

export default async function DocumentsPage() {
  const { context } = await requireWebSession();
  const teacher = context.role === "TEACHER";
  return (
    <AppShell>
      <PageHeader eyebrow={teacher ? "พื้นที่ทำงานของครู" : "พื้นที่บริหารโรงเรียน"} title="เอกสาร" description={teacher ? "เอกสารประกอบการสอนของคุณ" : "เอกสารที่ใช้ร่วมกันภายในโรงเรียน"} />
      <WorkspacePlaceholder title="ศูนย์เอกสารกำลังเตรียมให้พร้อม" description="หน้านี้แยกตามสิทธิ์ผู้ใช้งานแล้ว โดยยังไม่มีการอัปโหลดหรือจัดเก็บเอกสารในสปรินต์นี้" />
    </AppShell>
  );
}
