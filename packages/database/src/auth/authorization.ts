import type { TrustedAuthContext, UserRole } from "@classroom-os/types";

import { getPrismaClient } from "../client.js";
import { findActiveCoverageAccess } from "../repositories/timetable-coverage.repository.js";
import { localDateForInstant } from "../services/timezone.js";
import { authError } from "./auth-errors.js";

type AssignmentRequirement = {
  schoolId: string;
  termId: string;
  classroomId: string;
  subjectId?: string;
};

export function requireAuthenticatedUser(
  context: TrustedAuthContext | null | undefined,
): TrustedAuthContext {
  if (!context?.userId || !context.schoolId) {
    throw authError("UNAUTHENTICATED", "Authentication is required.");
  }
  return context;
}

export function requireRole(
  context: TrustedAuthContext | null | undefined,
  allowedRoles: UserRole | readonly UserRole[],
): TrustedAuthContext {
  const authenticated = requireAuthenticatedUser(context);
  const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!allowed.includes(authenticated.role)) {
    throw authError("FORBIDDEN", "You do not have permission for this operation.");
  }
  return authenticated;
}

export function requireSchoolAccess(
  context: TrustedAuthContext | null | undefined,
  schoolId: string,
): TrustedAuthContext {
  const authenticated = requireAuthenticatedUser(context);
  if (!schoolId || authenticated.schoolId !== schoolId) {
    throw authError("FORBIDDEN", "You do not have access to this school.");
  }
  return authenticated;
}

export function requireTeacherProfile(
  context: TrustedAuthContext | null | undefined,
): TrustedAuthContext & { teacherId: string } {
  const authenticated = requireRole(context, "TEACHER");
  if (!authenticated.teacherId) {
    throw authError("FORBIDDEN", "An active teacher profile is required.");
  }
  return { ...authenticated, teacherId: authenticated.teacherId };
}

export async function requireTeachingAssignment(
  context: TrustedAuthContext | null | undefined,
  requirement: AssignmentRequirement,
): Promise<void> {
  const authenticated = requireSchoolAccess(context, requirement.schoolId);
  if (authenticated.role !== "TEACHER") return;

  const teacher = requireTeacherProfile(authenticated);
  const assignment = await getPrismaClient().teachingAssignment.findFirst({
    where: {
      schoolId: authenticated.schoolId,
      teacherId: teacher.teacherId,
      termId: requirement.termId,
      classroomId: requirement.classroomId,
      ...(requirement.subjectId ? { subjectId: requirement.subjectId } : {}),
    },
    select: { id: true },
  });
  if (!assignment) {
    throw authError("FORBIDDEN", "A matching teaching assignment is required.");
  }
}

export async function requireClassSessionAccess(
  context: TrustedAuthContext | null | undefined,
  sessionId: string,
  expectedClassroomId?: string,
): Promise<void> {
  const authenticated = requireAuthenticatedUser(context);
  const session = await getPrismaClient().classSession.findFirst({
    where: { id: sessionId, schoolId: authenticated.schoolId },
    select: {
      schoolId: true, termId: true, classroomId: true, subjectId: true,
      timetableEntryId: true, scheduledStart: true,
      school: { select: { timezone: true } },
    },
  });
  if (!session) throw authError("FORBIDDEN", "The class session is not accessible.");
  if (expectedClassroomId && session.classroomId !== expectedClassroomId) {
    throw authError("FORBIDDEN", "The class session does not belong to this classroom.");
  }
  if (authenticated.role === "TEACHER" && session.timetableEntryId && authenticated.teacherId) {
    const coverage = await findActiveCoverageAccess(getPrismaClient(), {
      schoolId: authenticated.schoolId,
      teacherId: authenticated.teacherId,
      timetableEntryId: session.timetableEntryId,
      localDate: new Date(`${localDateForInstant(session.scheduledStart, session.school.timezone)}T00:00:00.000Z`),
    });
    if (coverage) return;
  }
  await requireTeachingAssignment(authenticated, session);
}

export async function requireClassroomAccess(
  context: TrustedAuthContext | null | undefined,
  requirement: { classroomId: string; termId?: string; subjectId?: string },
): Promise<void> {
  const authenticated = requireAuthenticatedUser(context);
  const prisma = getPrismaClient();
  const classroom = await prisma.classroom.findFirst({
    where: { id: requirement.classroomId, schoolId: authenticated.schoolId },
    select: { id: true },
  });
  if (!classroom) throw authError("FORBIDDEN", "The classroom is not accessible.");
  if (authenticated.role !== "TEACHER") return;
  const teacher = requireTeacherProfile(authenticated);
  const assignment = await prisma.teachingAssignment.findFirst({
    where: {
      schoolId: authenticated.schoolId,
      teacherId: teacher.teacherId,
      classroomId: requirement.classroomId,
      ...(requirement.termId ? { termId: requirement.termId } : {}),
      ...(requirement.subjectId ? { subjectId: requirement.subjectId } : {}),
    },
    select: { id: true },
  });
  if (!assignment) throw authError("FORBIDDEN", "The classroom is not assigned to this teacher.");
}

export async function requireStudentAccess(
  context: TrustedAuthContext | null | undefined,
  studentId: string,
): Promise<void> {
  const authenticated = requireAuthenticatedUser(context);
  const prisma = getPrismaClient();
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId: authenticated.schoolId },
    select: {
      id: true,
      classEnrollments: {
        where: { schoolId: authenticated.schoolId, isActive: true },
        select: { termId: true, classroomId: true },
      },
    },
  });
  if (!student) throw authError("FORBIDDEN", "The student is not accessible.");
  if (authenticated.role !== "TEACHER") return;
  const teacher = requireTeacherProfile(authenticated);
  const assignment = await prisma.teachingAssignment.findFirst({
    where: {
      schoolId: authenticated.schoolId,
      teacherId: teacher.teacherId,
      OR: student.classEnrollments.map(({ termId, classroomId }) => ({ termId, classroomId })),
    },
    select: { id: true },
  });
  if (!assignment) throw authError("FORBIDDEN", "The student is not in an assigned classroom.");
}

export async function requireTimetableEntryAccess(
  context: TrustedAuthContext | null | undefined,
  timetableEntryId: string,
  localDate?: string,
): Promise<void> {
  const authenticated = requireAuthenticatedUser(context);
  const entry = await getPrismaClient().timetableEntry.findFirst({
    where: { id: timetableEntryId, schoolId: authenticated.schoolId },
    select: { schoolId: true, termId: true, classroomId: true, subjectId: true },
  });
  if (!entry) throw authError("FORBIDDEN", "The timetable entry is not accessible.");
  if (
    authenticated.role === "TEACHER" && authenticated.teacherId && localDate &&
    /^\d{4}-\d{2}-\d{2}$/.test(localDate) &&
    !Number.isNaN(new Date(`${localDate}T00:00:00.000Z`).getTime())
  ) {
    const coverage = await findActiveCoverageAccess(getPrismaClient(), {
      schoolId: authenticated.schoolId,
      teacherId: authenticated.teacherId,
      timetableEntryId,
      localDate: new Date(`${localDate}T00:00:00.000Z`),
    });
    if (coverage) return;
  }
  await requireTeachingAssignment(authenticated, entry);
}

export async function requireAttendanceAccess(
  context: TrustedAuthContext | null | undefined,
  requirement: string | { sessionId: string; classroomId: string },
): Promise<void> {
  const sessionId = typeof requirement === "string" ? requirement : requirement.sessionId;
  const classroomId = typeof requirement === "string" ? undefined : requirement.classroomId;
  await requireClassSessionAccess(context, sessionId, classroomId);
}

export async function requireAssessmentAccess(
  context: TrustedAuthContext | null | undefined,
  assessmentId: string,
  expectedClassroomId?: string,
): Promise<void> {
  const authenticated = requireAuthenticatedUser(context);
  const assessment = await getPrismaClient().assessment.findFirst({
    where: { id: assessmentId, schoolId: authenticated.schoolId },
    select: { schoolId: true, termId: true, classroomId: true, subjectId: true, classSessionId: true },
  });
  if (!assessment) throw authError("FORBIDDEN", "The assessment is not accessible.");
  if (expectedClassroomId && assessment.classroomId !== expectedClassroomId) {
    throw authError("FORBIDDEN", "The assessment does not belong to this classroom.");
  }
  if (assessment.classSessionId) {
    await requireClassSessionAccess(authenticated, assessment.classSessionId, assessment.classroomId);
    return;
  }
  await requireTeachingAssignment(authenticated, assessment);
}

export async function requireScoreAccess(
  context: TrustedAuthContext | null | undefined,
  requirement: string | { assessmentId: string; classroomId: string },
): Promise<void> {
  const assessmentId = typeof requirement === "string" ? requirement : requirement.assessmentId;
  const classroomId = typeof requirement === "string" ? undefined : requirement.classroomId;
  await requireAssessmentAccess(context, assessmentId, classroomId);
}

export function trustedTenantInput<T extends object>(
  context: TrustedAuthContext | null | undefined,
  input: T,
): T & { schoolId: string; actorUserId: string } {
  const authenticated = requireAuthenticatedUser(context);
  return {
    ...input,
    schoolId: authenticated.schoolId,
    actorUserId: authenticated.userId,
  };
}
