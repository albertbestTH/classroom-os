import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StudentDirectory } from "@/components/student-directory";
import { students } from "@/data/mock-data";

export default function StudentsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="การจัดการนักเรียน"
        title="นักเรียน"
        description="ค้นหาและติดตามภาพรวมการเรียนของนักเรียนทั้งหมด"
        action={
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            + เพิ่มนักเรียน
          </button>
        }
      />
      <StudentDirectory students={students} />
    </AppShell>
  );
}
