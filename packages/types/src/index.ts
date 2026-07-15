export const USER_ROLES = ['school_admin', 'teacher'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SESSION_STATUSES = ['scheduled', 'live', 'completed', 'cancelled'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const ATTENDANCE_STATUSES = ['present', 'late', 'absent', 'leave'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ASSESSMENT_TYPES = [
  'quiz',
  'homework',
  'exam',
  'project',
  'participation',
  'other',
] as const;
export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

export interface ClassSession {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: SessionStatus;
}
