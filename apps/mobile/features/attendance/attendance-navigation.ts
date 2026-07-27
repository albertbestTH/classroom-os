export const attendanceSessionPath = (sessionId: string) => `/sessions/${sessionId}` as const;
export const attendanceSummaryPath = (sessionId: string) => `/sessions/${sessionId}/summary` as const;
