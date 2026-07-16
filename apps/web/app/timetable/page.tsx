import {
  listAcademicYears,
  listTeachingAssignments,
  listTerms,
  listTimetableEntries,
} from "@classroom-os/database";

import { AppShell } from "@/components/app-shell";
import { TimetableManager } from "@/components/classroom/timetable-manager";
import { PageHeader } from "@/components/page-header";
import { requireWebSession } from "@/lib/auth";

export default async function TimetablePage() {
  const { context } = await requireWebSession();
  const [years, terms, assignments] = await Promise.all([
    listAcademicYears({ schoolId: context.schoolId }),
    listTerms({ schoolId: context.schoolId }),
    listTeachingAssignments({ auth: context }),
  ]);
  const currentYear = years.find((year) => year.isCurrent) ?? null;
  const currentTerm = terms.find((term) => term.isCurrent && (!currentYear || term.academicYearId === currentYear.id)) ?? null;
  const entries = currentTerm ? await listTimetableEntries({
    schoolId: context.schoolId,
    termId: currentTerm.id,
    teacherId: context.role === "TEACHER" ? context.teacherId ?? undefined : undefined,
  }) : [];
  const currentAssignments = currentTerm ? assignments.filter((item) => item.termId === currentTerm.id) : [];

  return (
    <AppShell>
      <PageHeader
        eyebrow={currentTerm ? `${currentTerm.name} · ${currentTerm.academicYearName}` : "ยังไม่มีภาคเรียนปัจจุบัน"}
        title="ตารางสอน"
        description="จัดตารางรายสัปดาห์แยกตามครู ห้องเรียน รายวิชา และงานสอน"
      />
      {!currentTerm ? <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">กำหนดปีการศึกษาและภาคเรียนปัจจุบันก่อนสร้างตารางสอน</div> : <TimetableManager entries={entries} assignments={currentAssignments} role={context.role} />}
    </AppShell>
  );
}
