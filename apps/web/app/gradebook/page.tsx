import { getGradebook, listTeachingAssignments } from "@classroom-os/database";

import { AppShell } from "@/components/app-shell";
import { GradebookWorkspace } from "@/components/gradebook/gradebook-workspace";
import { PageHeader } from "@/components/page-header";
import { requireWebSession } from "@/lib/auth";

type GradebookPageProps = {
  searchParams: Promise<{ assignment?: string }>;
};

export default async function GradebookPage({ searchParams }: GradebookPageProps) {
  const { context } = await requireWebSession();
  const assignments = await listTeachingAssignments({ auth: context });
  const requestedId = (await searchParams).assignment;
  const selected = assignments.find(({ id }) => id === requestedId) ?? assignments[0] ?? null;
  const gradebook = selected
    ? await getGradebook({ schoolId: context.schoolId, teachingAssignmentId: selected.id })
    : null;

  return (
    <AppShell>
      <PageHeader
        eyebrow={selected ? `${selected.classroomName} · ${selected.subjectName}` : "ยังไม่มีงานสอน"}
        title="สมุดคะแนน"
        description="คะแนนจริงจากฐานข้อมูลเดียวกับแอปครู แยกศูนย์คะแนนออกจากรายการที่ยังไม่ได้กรอก"
      />
      <GradebookWorkspace key={selected?.id ?? "empty"} assignments={assignments} gradebook={gradebook} />
    </AppShell>
  );
}
