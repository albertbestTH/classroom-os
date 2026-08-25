import { useLocalSearchParams } from "expo-router";

import { AssessmentScoreScreen } from "@/features/scores/assessment-score-screen";

export default function GradebookScoreRoute() {
  const { assignmentId, assessmentId } = useLocalSearchParams<{ assignmentId: string; assessmentId: string }>();
  return <AssessmentScoreScreen teachingAssignmentId={assignmentId} assessmentId={assessmentId} />;
}
