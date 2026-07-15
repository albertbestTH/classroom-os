import { listAcademicYears } from "@classroom-os/database";

import { AcademicYearManager } from "@/components/admin/academic-year-manager";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { requireAdminWebSession } from "@/lib/auth";

export default async function AcademicYearsPage() {
  const { context } = await requireAdminWebSession(); const years = await listAcademicYears({ schoolId: context.schoolId });
  return <AppShell><PageHeader eyebrow="ปฏิทินการศึกษา" title="ปีการศึกษา" description="กำหนดช่วงวันที่และปีการศึกษาปัจจุบันของโรงเรียน" /><AcademicYearManager years={years} /></AppShell>;
}
