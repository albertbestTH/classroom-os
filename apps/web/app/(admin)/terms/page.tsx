import { listAcademicYears, listTerms } from "@classroom-os/database";

import { TermManager } from "@/components/admin/term-manager";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { requireAdminWebSession } from "@/lib/auth";

export default async function TermsPage() {
  const { context } = await requireAdminWebSession(); const [years, terms] = await Promise.all([listAcademicYears({ schoolId: context.schoolId }), listTerms({ schoolId: context.schoolId })]);
  return <AppShell><PageHeader eyebrow="ปฏิทินการศึกษา" title="ภาคเรียน" description="ภาคเรียนต้องอยู่ภายในช่วงวันที่ของปีการศึกษา และมีภาคเรียนปัจจุบันได้หนึ่งรายการ" /><TermManager years={years} terms={terms} /></AppShell>;
}
