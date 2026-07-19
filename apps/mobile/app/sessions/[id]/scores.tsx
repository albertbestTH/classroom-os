import { useLocalSearchParams } from "expo-router";

import { QuickScoreScreen } from "@/features/scores/quick-score-screen";

export default function QuickScoreRoute() {
  const { id, teachingAssignmentId, classroomId } = useLocalSearchParams<{
    id: string;
    teachingAssignmentId: string;
    classroomId: string;
  }>();
  return <QuickScoreScreen sessionId={id} teachingAssignmentId={teachingAssignmentId} classroomId={classroomId} />;
}
