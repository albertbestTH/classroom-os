import { getClassSession, getGradebook, requireClassSessionAccess } from "@classroom-os/database";

import { AppShell } from "@/components/app-shell";
import { QuickScorePanel } from "@/components/classroom/quick-score-panel";
import { requireWebSession } from "@/lib/auth";

export default async function SessionScoresPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { context } = await requireWebSession();
  await requireClassSessionAccess(context, id);
  const session = await getClassSession({ schoolId: context.schoolId, sessionId: id });
  const gradebook = await getGradebook({ schoolId: context.schoolId, teachingAssignmentId: session.teachingAssignmentId });
  const assessment = gradebook.assessments.find((item) => item.classSessionId === id) ?? null;
  return <AppShell><QuickScorePanel session={session} gradebook={gradebook} assessment={assessment} /></AppShell>;
}
