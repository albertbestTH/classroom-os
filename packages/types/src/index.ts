export const USER_ROLES = ["school_admin", "teacher"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SESSION_STATUSES = [
  "scheduled",
  "live",
  "completed",
  "cancelled",
] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const ATTENDANCE_STATUSES = [
  "present",
  "late",
  "absent",
  "leave",
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ASSESSMENT_TYPES = [
  "quiz",
  "homework",
  "exam",
  "project",
  "participation",
  "other",
] as const;
export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

export const DOMAIN_ERROR_CODES = [
  "NOT_FOUND",
  "TENANT_ACCESS_DENIED",
  "CONFLICT",
  "VALIDATION_ERROR",
  "INVALID_STATE_TRANSITION",
] as const;
export type DomainErrorCode = (typeof DOMAIN_ERROR_CODES)[number];

export interface TenantServiceInput {
  schoolId: string;
  actorUserId?: string | null;
}

export interface CreateStudentInput extends TenantServiceInput {
  studentNumber: string;
  firstName: string;
  lastName: string;
  preferredName?: string | null;
  dateOfBirth?: string | null;
  isActive?: boolean;
}

export interface UpdateStudentInput extends TenantServiceInput {
  studentId: string;
  firstName?: string;
  lastName?: string;
  preferredName?: string | null;
  dateOfBirth?: string | null;
  isActive?: boolean;
}

export interface CreateClassroomInput extends TenantServiceInput {
  code: string;
  name: string;
  gradeLevel: string;
  homeroomTeacherId?: string | null;
  isActive?: boolean;
}

export interface UpdateClassroomInput extends TenantServiceInput {
  classroomId: string;
  name?: string;
  gradeLevel?: string;
  homeroomTeacherId?: string | null;
  isActive?: boolean;
}

export interface CreateTimetableEntryInput extends TenantServiceInput {
  termId: string;
  teacherId: string;
  classroomId: string;
  subjectId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  room?: string | null;
}

export interface UpdateTimetableEntryInput extends TenantServiceInput {
  timetableEntryId: string;
  teacherId?: string;
  classroomId?: string;
  subjectId?: string;
  weekday?: number;
  startTime?: string;
  endTime?: string;
  room?: string | null;
  isActive?: boolean;
}

export interface CreateClassSessionInput extends TenantServiceInput {
  timetableEntryId: string;
  scheduledStart: string;
  scheduledEnd: string;
  notes?: string | null;
}

export interface StartClassSessionInput extends TenantServiceInput {
  sessionId: string;
  startedAt?: string;
}

export interface EndClassSessionInput extends TenantServiceInput {
  sessionId: string;
  endedAt?: string;
}

export interface AttendanceBatchItem {
  studentId: string;
  status: AttendanceStatus;
  note?: string | null;
}

export interface UpdateAttendanceBatchInput extends TenantServiceInput {
  sessionId: string;
  records: AttendanceBatchItem[];
}

export interface CreateAssessmentInput extends TenantServiceInput {
  termId: string;
  classroomId: string;
  subjectId: string;
  teacherId: string;
  classSessionId?: string | null;
  title: string;
  type: AssessmentType;
  maxScore: number;
  dueAt?: string | null;
}

export interface ScoreBatchItem {
  studentId: string;
  value: number;
  feedback?: string | null;
}

export interface UpdateScoreBatchInput extends TenantServiceInput {
  assessmentId: string;
  gradedById?: string | null;
  scores: ScoreBatchItem[];
}

export interface StudentResult {
  id: string;
  schoolId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  dateOfBirth: string | null;
  isActive: boolean;
}

export interface ClassroomResult {
  id: string;
  schoolId: string;
  code: string;
  name: string;
  gradeLevel: string;
  homeroomTeacherId: string | null;
  isActive: boolean;
}

export interface TimetableEntryResult {
  id: string;
  schoolId: string;
  termId: string;
  teacherId: string;
  classroomId: string;
  subjectId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  room: string | null;
  isActive: boolean;
}

export interface ClassSessionResult {
  id: string;
  schoolId: string;
  termId: string;
  timetableEntryId: string | null;
  classroomId: string;
  subjectId: string;
  teacherId: string;
  scheduledStart: string;
  scheduledEnd: string;
  startedAt: string | null;
  endedAt: string | null;
  status: SessionStatus;
}

export interface AttendanceRecordResult {
  id: string;
  studentId: string;
  status: AttendanceStatus;
  note: string | null;
  recordedAt: string;
}

export interface AssessmentResult {
  id: string;
  schoolId: string;
  termId: string;
  classroomId: string;
  subjectId: string;
  teacherId: string;
  classSessionId: string | null;
  title: string;
  type: AssessmentType;
  maxScore: number;
  dueAt: string | null;
}

export interface ScoreResult {
  id: string;
  assessmentId: string;
  studentId: string;
  value: number;
  feedback: string | null;
  gradedAt: string;
}

export interface BatchServiceResult<T> {
  count: number;
  records: T[];
}

export interface AuditLogResult {
  id: string;
  schoolId: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}
