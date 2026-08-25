import { createAssessment, getClassSession, getGradebook, getOrCreateDefaultScoreCategory, requireClassSessionAccess } from "@classroom-os/database";

import { AppShell } from "@/components/app-shell";
import { QuickScorePanel } from "@/components/classroom/quick-score-panel";
import { requireWebSession } from "@/lib/auth";

export default async function SessionScoresPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { context } = await requireWebSession();
  await requireClassSessionAccess(context, id);
  const session = await getClassSession({ schoolId: context.schoolId, sessionId: id });
  let gradebook = await getGradebook({ schoolId: context.schoolId, teachingAssignmentId: session.teachingAssignmentId });
  let assessment = gradebook.assessments.find((item) => item.classSessionId === id) ?? null;
  if (!assessment && session.status !== "cancelled") {
    const category = await getOrCreateDefaultScoreCategory({
      schoolId: context.schoolId,
      termId: session.termId,
      teachingAssignmentId: session.teachingAssignmentId,
      name: "คะแนนด่วน",
    });
    await createAssessment({
      schoolId: context.schoolId,
      teachingAssignmentId: session.teachingAssignmentId,
      termId: session.termId,
      classroomId: session.classroomId,
      subjectId: session.subjectId,
      teacherId: session.teacherId,
      categoryId: category.id,
      classSessionId: id,
      title: `คะแนนด่วน · ${session.subjectName}`,
      type: "participation",
      maxScore: 10,
      assessmentDate: session.scheduledStart.slice(0, 10),
    });
    gradebook = await getGradebook({ schoolId: context.schoolId, teachingAssignmentId: session.teachingAssignmentId });
    assessment = gradebook.assessments.find((item) => item.classSessionId === id) ?? null;
  }
  return <AppShell><QuickScorePanel session={session} gradebook={gradebook} assessment={assessment} /></AppShell>;
}
