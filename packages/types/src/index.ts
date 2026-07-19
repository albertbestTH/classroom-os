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
  employeeCode: string | null;
  assignmentCount: number;
}

export interface MobileSessionResult {
  token: string;
  expiresAt: string;
  user: CurrentUserResult;
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
  teacherIsActive: boolean | null;
  assignmentCount: number;
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
  academicYearId: string;
  termId: string;
  classroomId: string;
  subjectId: string;
  teacherName: string;
  classroomName: string;
  subjectCode: string;
  subjectName: string;
  termName: string;
  academicYearName: string;
  createdAt: string;
}

export interface CreateSubjectInput extends TenantServiceInput {
  code: string;
  name: string;
  isActive?: boolean;
}

export interface UpdateSubjectInput extends TenantServiceInput {
  subjectId: string;
  code?: string;
  name?: string;
  isActive?: boolean;
}

export interface CreateAcademicYearInput extends TenantServiceInput {
  name: string;
  startsOn: string;
  endsOn: string;
  isCurrent?: boolean;
}

export interface UpdateAcademicYearInput extends TenantServiceInput {
  academicYearId: string;
  name?: string;
  startsOn?: string;
  endsOn?: string;
  isCurrent?: boolean;
}

export interface CreateTermInput extends TenantServiceInput {
  academicYearId: string;
  name: string;
  startsOn: string;
  endsOn: string;
  isCurrent?: boolean;
}

export interface UpdateTermInput extends TenantServiceInput {
  termId: string;
  name?: string;
  startsOn?: string;
  endsOn?: string;
  isCurrent?: boolean;
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

export const SESSION_TIMELINE_EVENT_TYPES = [
  "SESSION_STARTED",
  "ATTENDANCE_UPDATED",
  "ATTENDANCE_CORRECTED",
  "SESSION_ENDED",
  "SESSION_CANCELLED",
] as const;
export type SessionTimelineEventType =
  (typeof SESSION_TIMELINE_EVENT_TYPES)[number];

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
  code?: string;
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

export interface MaterializeClassSessionInput extends TenantServiceInput {
  timetableEntryId: string;
  localDate: string;
}

export interface StartClassSessionInput extends TenantServiceInput {
  sessionId: string;
  startedAt?: string;
  expectedUpdatedAt?: string;
}

export interface EndClassSessionInput extends TenantServiceInput {
  sessionId: string;
  endedAt?: string;
  expectedUpdatedAt?: string;
}

export interface CancelClassSessionInput extends TenantServiceInput {
  sessionId: string;
  reason: string;
  expectedUpdatedAt?: string;
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

export interface CorrectAttendanceInput extends TenantServiceInput {
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  note?: string | null;
  reason: string;
  expectedRecordUpdatedAt: string;
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
  profileImageKey: string | null;
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
  studentCount?: number;
  teachingAssignmentCount?: number;
}

export interface SubjectResult {
  id: string;
  schoolId: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicYearResult {
  id: string;
  schoolId: string;
  name: string;
  startsOn: string;
  endsOn: string;
  isCurrent: boolean;
  termCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TermResult {
  id: string;
  schoolId: string;
  academicYearId: string;
  academicYearName: string;
  name: string;
  startsOn: string;
  endsOn: string;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TimetableEntryResult {
  id: string;
  schoolId: string;
  termId: string;
  teachingAssignmentId: string;
  teacherId: string;
  classroomId: string;
  subjectId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  room: string | null;
  isActive: boolean;
  teacherName: string;
  classroomName: string;
  subjectCode: string;
  subjectName: string;
  termName: string;
  academicYearName: string;
}

export const TIMETABLE_COVERAGE_KINDS = ["cover", "swap"] as const;
export type TimetableCoverageKind = (typeof TIMETABLE_COVERAGE_KINDS)[number];
export const TIMETABLE_COVERAGE_STATUSES = ["pending", "active", "declined", "cancelled"] as const;
export type TimetableCoverageStatus = (typeof TIMETABLE_COVERAGE_STATUSES)[number];

export interface RequestTimetableCoverageInput {
  timetableEntryId: string;
  substituteTeacherId: string;
  localDate: string;
  kind: TimetableCoverageKind;
  reciprocalEntryId?: string | null;
  reason?: string | null;
}

export interface TimetableCoverageResult {
  id: string;
  schoolId: string;
  timetableEntryId: string;
  reciprocalEntryId: string | null;
  originalTeacherId: string;
  originalTeacherName: string;
  substituteTeacherId: string;
  substituteTeacherName: string;
  localDate: string;
  kind: TimetableCoverageKind;
  status: TimetableCoverageStatus;
  reason: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface ClassSessionResult {
  id: string;
  schoolId: string;
  termId: string;
  timetableEntryId: string | null;
  teachingAssignmentId: string;
  classroomId: string;
  subjectId: string;
  teacherId: string;
  scheduledStart: string;
  scheduledEnd: string;
  startedAt: string | null;
  endedAt: string | null;
  cancelledAt: string | null;
  cancelledById: string | null;
  cancellationReason: string | null;
  status: SessionStatus;
  updatedAt: string;
  teacherName: string;
  classroomName: string;
  subjectCode: string;
  subjectName: string;
  termName: string;
  academicYearName: string;
  enrolledStudentCount: number;
  attendanceRecordedCount: number;
}

export interface AttendanceRecordResult {
  id: string;
  studentId: string;
  status: AttendanceStatus;
  note: string | null;
  recordedAt: string;
  updatedAt: string;
}

export interface AttendanceCorrectionResult {
  id: string;
  attendanceRecordId: string;
  classSessionId: string;
  studentId: string;
  actorUserId: string | null;
  actorName: string | null;
  beforeStatus: AttendanceStatus;
  afterStatus: AttendanceStatus;
  beforeNote: string | null;
  afterNote: string | null;
  reason: string;
  createdAt: string;
}

export interface SessionAttendanceStudentResult {
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  profileImageKey: string | null;
  status: AttendanceStatus | null;
  note: string | null;
  recordedAt: string | null;
  recordUpdatedAt: string | null;
  corrections: AttendanceCorrectionResult[];
}

export interface SessionAttendanceResult {
  sessionId: string;
  classroomId: string;
  status: SessionStatus;
  students: SessionAttendanceStudentResult[];
  recordedCount: number;
  enrolledCount: number;
}

export interface SessionTimelineEventResult {
  id: string;
  classSessionId: string;
  actorUserId: string | null;
  eventType: SessionTimelineEventType;
  metadata: Readonly<Record<string, unknown>>;
  createdAt: string;
}

export type TodayClassStatus = "scheduled" | "live" | "completed" | "cancelled" | "missed";

export interface TodayClassResult {
  timetableEntry: TimetableEntryResult;
  session: ClassSessionResult | null;
  status: TodayClassStatus;
  scheduledStart: string;
  scheduledEnd: string;
  coverage: TimetableCoverageResult | null;
}

export interface TodayTimetableResult {
  localDate: string;
  timezone: string;
  currentAcademicYear: AcademicYearResult | null;
  currentTerm: TermResult | null;
  classes: TodayClassResult[];
  nextClass: TodayClassResult | null;
  completedCount: number;
  cancelledCount: number;
  missedCount: number;
  incompleteAttendanceCount: number;
}

export interface AttendanceReportFilters {
  termId?: string;
  classroomId?: string;
  subjectId?: string;
  teacherId?: string;
  from?: string;
  to?: string;
}

export interface AttendanceStatusTotals {
  present: number;
  late: number;
  absent: number;
  leave: number;
  unrecorded: number;
}

export interface AttendanceReportSessionRow {
  sessionId: string;
  scheduledStart: string;
  status: SessionStatus;
  classroomId: string;
  classroomName: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  enrolledCount: number;
  recordedCount: number;
  totals: AttendanceStatusTotals;
  attendancePercentage: number;
}

export interface AttendanceReportStudentRow {
  studentId: string;
  studentNumber: string;
  studentName: string;
  classroomId: string;
  classroomName: string;
  subjectId: string;
  subjectName: string;
  sessionCount: number;
  totals: AttendanceStatusTotals;
  attendancePercentage: number;
}

export interface AttendanceReportResult {
  scopeLabel: string;
  termId: string;
  termName: string;
  timezone: string;
  from: string;
  to: string;
  filters: AttendanceReportFilters;
  totals: AttendanceStatusTotals;
  attendancePercentage: number;
  sessions: AttendanceReportSessionRow[];
  students: AttendanceReportStudentRow[];
}

export interface AttendanceStudentReportResult {
  studentId: string;
  studentNumber: string;
  studentName: string;
  report: AttendanceReportResult;
}

export interface AttendanceSessionReportResult {
  session: AttendanceReportSessionRow;
  students: Array<{
    studentId: string;
    studentNumber: string;
    studentName: string;
    status: AttendanceStatus | null;
    note: string | null;
  }>;
}

export interface DashboardOverviewFilters {
  days?: 7 | 30;
  termId?: string;
  teachingAssignmentId?: string;
  classroomId?: string;
  subjectId?: string;
  teacherId?: string;
}

export interface TeachingContext {
  academicYearId: string;
  academicYearName: string;
  termId: string;
  termName: string;
  teachingAssignmentId: string;
  teacherId: string;
  teacherName: string;
  classroomId: string;
  classroomName: string;
  subjectId: string;
  subjectName: string;
}

export interface DashboardAttendanceSummary {
  totals: AttendanceStatusTotals;
  attendedCount: number;
  eligibleCount: number;
  recordedCount: number;
  attendancePercentage: number;
  completionPercentage: number;
}

export interface DashboardTrendPoint {
  date: string;
  attendedCount: number;
  eligibleCount: number;
  percentage: number | null;
  hasSessions: boolean;
}

export interface DashboardClassroomComparison {
  classroomId: string;
  classroomName: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  attendedCount: number;
  eligibleCount: number;
  attendancePercentage: number | null;
}

export interface DashboardSessionStatusTotals {
  scheduled: number;
  live: number;
  completed: number;
  cancelled: number;
  missed: number;
  attendanceIncomplete: number;
}

export type DashboardActionType =
  | "LIVE_SESSION"
  | "INCOMPLETE_ATTENDANCE"
  | "MISSED_CLASS"
  | "REPEATED_ABSENCE"
  | "TIMETABLE_CONFLICT"
  | "CANCELLED_SESSION";

export interface DashboardActionItem {
  id: string;
  type: DashboardActionType;
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  href: string;
  classroomId: string | null;
  subjectId: string | null;
}

export interface DashboardRepeatedAbsence {
  studentId: string;
  studentName: string;
  classroomId: string;
  classroomName: string;
  subjectId: string;
  subjectName: string;
  absenceCount: number;
}

export interface DashboardFilterOption {
  id: string;
  label: string;
}

export interface DashboardOverviewResult {
  scope: "TEACHER" | "SCHOOL" | "TEACHER_FILTERED";
  viewerRole: UserRole;
  scopeLabel: string;
  selectedTeacher: DashboardFilterOption | null;
  availableTeachingContexts: TeachingContext[];
  selectedTeachingContext: TeachingContext | null;
  timezone: string;
  localDate: string;
  from: string;
  to: string;
  days: 7 | 30;
  filters: DashboardOverviewFilters;
  attendance: DashboardAttendanceSummary;
  sessionStatus: DashboardSessionStatusTotals;
  trend: DashboardTrendPoint[];
  classrooms: DashboardClassroomComparison[];
  nextClass: TodayClassResult | null;
  liveSession: TodayClassResult | null;
  today: TodayTimetableResult;
  actions: DashboardActionItem[];
  repeatedAbsences: DashboardRepeatedAbsence[];
  filterOptions: {
    terms: DashboardFilterOption[];
    classrooms: DashboardFilterOption[];
    subjects: DashboardFilterOption[];
    teachers: DashboardFilterOption[];
  };
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

export interface GradebookAssessmentResult extends AssessmentResult {
  scoreCount: number;
}

export interface GradebookStudentScoreResult {
  assessmentId: string;
  value: number | null;
  feedback: string | null;
  gradedAt: string | null;
}

export interface GradebookStudentResult {
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  profileImageKey: string | null;
  scores: GradebookStudentScoreResult[];
  earnedScore: number;
  gradedMaxScore: number;
  percentage: number | null;
}

export interface GradebookResult {
  teachingContext: TeachingContext;
  assessments: GradebookAssessmentResult[];
  students: GradebookStudentResult[];
  totalMaxScore: number;
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
