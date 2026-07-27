import type { QueryClient } from "@tanstack/react-query";

export const queryKeys = {
  today: ["today"] as const,
  timetable: ["timetable"] as const,
  assignments: ["assignments"] as const,
  classrooms: ["classrooms"] as const,
  coverages: ["timetable-coverages"] as const,
  session: (sessionId: string) => ["session", sessionId] as const,
  attendance: (sessionId: string) => ["attendance", sessionId] as const,
  attendanceSaveFeedback: (sessionId: string) => ["attendance-save-feedback", sessionId] as const,
  timeline: (sessionId: string) => ["timeline", sessionId] as const,
  gradebook: (teachingAssignmentId: string) => ["gradebook", teachingAssignmentId] as const,
};

export async function invalidateScoreWorkflow(queryClient: QueryClient, teachingAssignmentId: string, sessionId?: string): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.gradebook(teachingAssignmentId) }),
    ...(sessionId ? [queryClient.invalidateQueries({ queryKey: queryKeys.session(sessionId) })] : []),
    queryClient.invalidateQueries({ queryKey: queryKeys.today }),
  ]);
}

export async function invalidateSessionWorkflow(
  queryClient: QueryClient,
  sessionId: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.session(sessionId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.attendance(sessionId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.timeline(sessionId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.today }),
    queryClient.invalidateQueries({ queryKey: queryKeys.timetable }),
    queryClient.invalidateQueries({ queryKey: queryKeys.assignments }),
  ]);
}
