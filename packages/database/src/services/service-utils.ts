import type {
  AssessmentResult,
  AttendanceRecordResult,
  ClassroomResult,
  ClassSessionResult,
  ScoreResult,
  StudentResult,
  TenantServiceInput,
  TimetableEntryResult,
} from "@classroom-os/types";

import { domainError, withDomainErrors } from "../domain-errors.js";
import type {
  Assessment,
  AttendanceRecord,
  Classroom,
  Score,
  Student,
} from "../generated/prisma/client.js";
import type { TimetableEntryWithDetails } from "../repositories/timetable.repository.js";
import type { ClassSessionWithDetails } from "../repositories/session.repository.js";

export function executeTenantService<T>(
  input: TenantServiceInput,
  operation: () => Promise<T>,
): Promise<T> {
  if (!input.schoolId?.trim()) {
    return Promise.reject(
      domainError(
        "TENANT_ACCESS_DENIED",
        "A valid school scope is required for this operation.",
      ),
    );
  }

  return withDomainErrors(operation);
}

export function clockStringToDate(value: string): Date {
  const [hours = 0, minutes = 0] = value.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, hours, minutes));
}

function clockDateToString(value: Date): string {
  return `${String(value.getUTCHours()).padStart(2, "0")}:${String(
    value.getUTCMinutes(),
  ).padStart(2, "0")}`;
}

export function toStudentResult(student: Student): StudentResult {
  return {
    id: student.id,
    schoolId: student.schoolId,
    studentNumber: student.studentNumber,
    firstName: student.firstName,
    lastName: student.lastName,
    preferredName: student.preferredName,
    dateOfBirth: student.dateOfBirth?.toISOString().slice(0, 10) ?? null,
    isActive: student.isActive,
  };
}

export function toClassroomResult(
  classroom: Classroom & {
    _count?: { classEnrollments: number; teachingAssignments: number };
  },
): ClassroomResult {
  return {
    id: classroom.id,
    schoolId: classroom.schoolId,
    code: classroom.code,
    name: classroom.name,
    gradeLevel: classroom.gradeLevel,
    homeroomTeacherId: classroom.homeroomTeacherId,
    isActive: classroom.isActive,
    ...(classroom._count
      ? {
          studentCount: classroom._count.classEnrollments,
          teachingAssignmentCount: classroom._count.teachingAssignments,
        }
      : {}),
  };
}

export function toTimetableEntryResult(
  entry: TimetableEntryWithDetails,
): TimetableEntryResult {
  const assignment = entry.teachingAssignment;
  return {
    id: entry.id,
    schoolId: entry.schoolId,
    termId: entry.termId,
    teachingAssignmentId: entry.teachingAssignmentId,
    teacherId: entry.teacherId,
    classroomId: entry.classroomId,
    subjectId: entry.subjectId,
    weekday: entry.weekday,
    startTime: clockDateToString(entry.startTime),
    endTime: clockDateToString(entry.endTime),
    room: entry.room,
    isActive: entry.isActive,
    teacherName: `${assignment.teacher.firstName} ${assignment.teacher.lastName}`,
    classroomName: assignment.classroom.name,
    subjectCode: assignment.subject.code,
    subjectName: assignment.subject.name,
    termName: assignment.term.name,
    academicYearName: assignment.term.academicYear.name,
  };
}

export function toClassSessionResult(
  session: ClassSessionWithDetails,
): ClassSessionResult {
  const assignment = session.teachingAssignment;
  return {
    id: session.id,
    schoolId: session.schoolId,
    termId: session.termId,
    timetableEntryId: session.timetableEntryId,
    teachingAssignmentId: session.teachingAssignmentId,
    classroomId: session.classroomId,
    subjectId: session.subjectId,
    teacherId: session.teacherId,
    scheduledStart: session.scheduledStart.toISOString(),
    scheduledEnd: session.scheduledEnd.toISOString(),
    startedAt: session.startedAt?.toISOString() ?? null,
    endedAt: session.endedAt?.toISOString() ?? null,
    cancelledAt: session.cancelledAt?.toISOString() ?? null,
    cancelledById: session.cancelledById,
    cancellationReason: session.cancellationReason,
    status: session.status,
    updatedAt: session.updatedAt.toISOString(),
    teacherName: `${assignment.teacher.firstName} ${assignment.teacher.lastName}`,
    classroomName: assignment.classroom.name,
    subjectCode: assignment.subject.code,
    subjectName: assignment.subject.name,
    termName: assignment.term.name,
    academicYearName: assignment.term.academicYear.name,
    enrolledStudentCount: session.enrolledStudentCount,
    attendanceRecordedCount: session._count.attendanceRecords,
  };
}

export function toAttendanceResult(record: AttendanceRecord): AttendanceRecordResult {
  return {
    id: record.id,
    studentId: record.studentId,
    status: record.status,
    note: record.note,
    recordedAt: record.recordedAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function toAssessmentResult(assessment: Assessment): AssessmentResult {
  return {
    id: assessment.id,
    schoolId: assessment.schoolId,
    termId: assessment.termId,
    classroomId: assessment.classroomId,
    subjectId: assessment.subjectId,
    teacherId: assessment.teacherId,
    classSessionId: assessment.classSessionId,
    title: assessment.title,
    type: assessment.type,
    maxScore: assessment.maxScore.toNumber(),
    dueAt: assessment.dueAt?.toISOString() ?? null,
  };
}

export function toScoreResult(score: Score): ScoreResult {
  return {
    id: score.id,
    assessmentId: score.assessmentId,
    studentId: score.studentId,
    value: score.value.toNumber(),
    feedback: score.feedback,
    gradedAt: score.gradedAt.toISOString(),
  };
}
