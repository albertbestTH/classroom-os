export const USER_ROLES = ["SCHOOL_OWNER", "ADMIN", "TEACHER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ACCOUNT_STATUSES = ["ACTIVE", "DISABLED"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const AUTH_ERROR_CODES = [
  "UNAUTHENTICATED",
  "INVALID_CREDENTIALS",
  "ACCOUNT_DISABLED",
  "FORBIDDEN",
  "RATE_LIMITED",
] as const;
export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

export interface TrustedAuthContext {
  userId: string;
  schoolId: string;
  role: UserRole;
  teacherId: string | null;
}

export interface CurrentUserResult extends TrustedAuthContext {
  email: string;
  firstName: string;
  lastName: string;
  schoolName: string;
}

export type ApiErrorCode =
  | AuthErrorCode
  | DomainErrorCode
  | "INTERNAL_ERROR";

export interface ApiSuccessResponse<T> {
  data: T;
}

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    fieldErrors?: Readonly<Record<string, readonly string[]>>;
  };
}

export interface CreateStaffAccountInput {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  temporaryPassword: string;
}

export interface SetStaffAccountStatusInput {
  userId: string;
  status: AccountStatus;
}

export interface AssignTeacherProfileInput {
  userId: string;
  employeeCode: string;
}

export interface CreateTeachingAssignmentInput {
  userId: string;
  termId: string;
  classroomId: string;
  subjectId: string;
}

export interface StaffUserResult {
  id: string;
  schoolId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: AccountStatus;
  teacherId: string | null;
  employeeCode: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface TeacherProfileResult {
  id: string;
  schoolId: string;
  userId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

export interface TeachingAssignmentResult {
  id: string;
  schoolId: string;
  userId: string;
  teacherId: string;
  termId: string;
  classroomId: string;
  subjectId: string;
  createdAt: string;
}

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
