import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { WorkspacePlaceholder } from "@/components/workspace-placeholder";

export default function ImportPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="พื้นที่บริหารโรงเรียน" title="นำเข้าข้อมูล" description="เตรียมข้อมูลระดับโรงเรียนก่อนเริ่มนำเข้า" />
      <WorkspacePlaceholder title="ยังไม่เปิดใช้งานการนำเข้า" description="สปรินต์นี้จัดวางสิทธิ์และตำแหน่งเมนูเท่านั้น ยังไม่มีการอ่านไฟล์หรือเขียนข้อมูลเข้าสู่ระบบ" />
    </AppShell>
  );
}
