import { useLocalSearchParams } from "expo-router";

import { AssessmentListScreen } from "@/features/scores/assessment-list-screen";

export default function GradebookAssessmentListRoute() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  return <AssessmentListScreen teachingAssignmentId={assignmentId} />;
}
