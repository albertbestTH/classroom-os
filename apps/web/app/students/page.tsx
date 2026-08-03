import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StudentDirectory } from "@/components/student-directory";

export default function StudentsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="การจัดการนักเรียน"
        title="นักเรียน"
        description="ค้นหาและติดตามภาพรวมการเรียนของนักเรียนทั้งหมด"
      />
      <StudentDirectory />
    </AppShell>
  );
}
