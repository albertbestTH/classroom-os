import type {
  AttendanceReportFilters,
  AttendanceReportResult,
  AttendanceReportSessionRow,
  AttendanceReportStudentRow,
  AttendanceSessionReportResult,
  AttendanceStatus,
  AttendanceStatusTotals,
  AttendanceStudentReportResult,
  TrustedAuthContext,
} from "@classroom-os/types";

import { requireSchoolAccess } from "../auth/authorization.js";
import { authError } from "../auth/auth-errors.js";
import { getPrismaClient } from "../client.js";
import { domainError } from "../domain-errors.js";
import { listTermsForSchool, requireTermForSchool } from "../repositories/academic-calendar.repository.js";
import {
  listAttendanceReportDataForSchool,
  type AttendanceReportEnrollment,
} from "../repositories/attendance-report.repository.js";
import { requireSchoolSettingsForSchool } from "../repositories/reference.repository.js";
import { requireClassSessionForSchool } from "../repositories/session.repository.js";
import { requireStudentForSchool } from "../repositories/student.repository.js";
import { attendanceReportFiltersSchema } from "../validation.js";
import { executeTenantService } from "./service-utils.js";
import { addLocalDays, localDateForInstant, localDateTimeToInstant } from "./timezone.js";
import { getSessionAttendanceRoster } from "./attendance.service.js";

type ReportInput = {
  schoolId: string;
  auth: TrustedAuthContext;
  filters?: AttendanceReportFilters;
};

const emptyTotals = (): AttendanceStatusTotals => ({
  present: 0,
  late: 0,
  absent: 0,
  leave: 0,
  unrecorded: 0,
});

function addStatus(totals: AttendanceStatusTotals, status: AttendanceStatus | null) {
  if (status) totals[status] += 1;
  else totals.unrecorded += 1;
}

function mergeTotals(target: AttendanceStatusTotals, source: AttendanceStatusTotals) {
  target.present += source.present;
  target.late += source.late;
  target.absent += source.absent;
  target.leave += source.leave;
  target.unrecorded += source.unrecorded;
}

function percentage(totals: AttendanceStatusTotals): number {
  const denominator =
    totals.present + totals.late + totals.absent + totals.leave + totals.unrecorded;
  return denominator === 0
    ? 0
    : Math.round(((totals.present + totals.late) / denominator) * 10_000) / 100;
}

function enrollmentsByClassroom(enrollments: AttendanceReportEnrollment[]) {
  const byClassroom = new Map<string, AttendanceReportEnrollment[]>();
  for (const enrollment of enrollments) {
    const current = byClassroom.get(enrollment.classroomId) ?? [];
    current.push(enrollment);
    byClassroom.set(enrollment.classroomId, current);
  }
  return byClassroom;
}

async function buildAttendanceReport(
  input: ReportInput,
  studentId?: string,
): Promise<AttendanceReportResult> {
  const auth = requireSchoolAccess(input.auth, input.schoolId);
  const filters = attendanceReportFiltersSchema.parse(input.filters ?? {});
  if (auth.role === "TEACHER" && filters.teacherId && filters.teacherId !== auth.teacherId) {
    throw authError("FORBIDDEN", "Teachers can only view their own attendance reports.");
  }
  if (auth.role === "TEACHER" && !auth.teacherId) {
    throw authError("FORBIDDEN", "An active teacher profile is required.");
  }

  const prisma = getPrismaClient();
  const school = await requireSchoolSettingsForSchool(prisma, input);
  const terms = await listTermsForSchool(prisma, input);
  const selectedTerm = filters.termId
    ? await requireTermForSchool(prisma, { schoolId: input.schoolId, termId: filters.termId })
    : terms.find(({ isCurrent }) => isCurrent);
  if (!selectedTerm) {
    throw domainError("VALIDATION_ERROR", "A current term is required for attendance reporting.");
  }

  const termFrom = selectedTerm.startsOn.toISOString().slice(0, 10);
  const termTo = selectedTerm.endsOn.toISOString().slice(0, 10);
  const from = filters.from ?? termFrom;
  const to = filters.to ?? termTo;
  const teacherId = auth.role === "TEACHER" ? auth.teacherId! : filters.teacherId;
  const data = await listAttendanceReportDataForSchool(prisma, {
    schoolId: input.schoolId,
    termId: selectedTerm.id,
    from: localDateTimeToInstant(from, "00:00", school.timezone),
    toExclusive: localDateTimeToInstant(addLocalDays(to, 1), "00:00", school.timezone),
    classroomId: filters.classroomId,
    subjectId: filters.subjectId,
    teacherId,
    studentId,
  });

  const enrollmentMap = enrollmentsByClassroom(data.enrollments);
  const totals = emptyTotals();
  const studentRows = new Map<string, AttendanceReportStudentRow>();
  const now = new Date();
  const sessions: AttendanceReportSessionRow[] = data.sessions.map((session) => {
    const expected = enrollmentMap.get(session.classroomId) ?? [];
    const records = new Map(session.attendanceRecords.map((record) => [record.studentId, record]));
    const sessionTotals = emptyTotals();
    const countsTowardAttendance =
      session.status !== "cancelled" &&
      (session.status === "live" ||
        session.status === "completed" ||
        session.scheduledStart <= now);
    if (countsTowardAttendance) {
      for (const enrollment of expected) {
        const status = records.get(enrollment.studentId)?.status ?? null;
        addStatus(sessionTotals, status);
        const key = `${enrollment.studentId}:${session.classroomId}:${session.subjectId}`;
        const row = studentRows.get(key) ?? {
          studentId: enrollment.student.id,
          studentNumber: enrollment.student.studentNumber,
          studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
          classroomId: session.classroomId,
          classroomName: session.classroom.name,
          subjectId: session.subjectId,
          subjectName: session.subject.name,
          sessionCount: 0,
          totals: emptyTotals(),
          attendancePercentage: 0,
        };
        row.sessionCount += 1;
        addStatus(row.totals, status);
        studentRows.set(key, row);
      }
      mergeTotals(totals, sessionTotals);
    }
    return {
      sessionId: session.id,
      scheduledStart: session.scheduledStart.toISOString(),
      status: session.status,
      classroomId: session.classroomId,
      classroomName: session.classroom.name,
      subjectId: session.subjectId,
      subjectName: session.subject.name,
      teacherId: session.teacherId,
      teacherName: `${session.teacher.firstName} ${session.teacher.lastName}`,
      enrolledCount: expected.length,
      recordedCount: expected.filter(({ studentId }) => records.has(studentId)).length,
      totals: sessionTotals,
      attendancePercentage: percentage(sessionTotals),
    };
  });

  const students = [...studentRows.values()]
    .map((row) => ({ ...row, attendancePercentage: percentage(row.totals) }))
    .sort((left, right) =>
      left.classroomName.localeCompare(right.classroomName, "th") ||
      left.studentNumber.localeCompare(right.studentNumber, "th"),
    );
  const effectiveFilters: AttendanceReportFilters = {
    ...filters,
    termId: selectedTerm.id,
    ...(teacherId ? { teacherId } : {}),
  };
  return {
    scopeLabel:
      auth.role === "TEACHER"
        ? "เฉพาะชั้นเรียนที่ได้รับมอบหมายของครูผู้เข้าสู่ระบบ"
        : filters.classroomId || filters.subjectId || filters.teacherId
          ? "รายงานระดับโรงเรียนตามตัวกรอง"
          : "ภาพรวมทั้งโรงเรียน (แยกตามชั้นเรียนและวิชา)",
    termId: selectedTerm.id,
    termName: `${selectedTerm.name} · ${selectedTerm.academicYear.name}`,
    timezone: school.timezone,
    from,
    to,
    filters: effectiveFilters,
    totals,
    attendancePercentage: percentage(totals),
    sessions,
    students,
  };
}

export function getAttendanceReport(input: ReportInput): Promise<AttendanceReportResult> {
  return executeTenantService(input, () => buildAttendanceReport(input));
}

export function getAttendanceStudentReport(
  input: ReportInput & { studentId: string },
): Promise<AttendanceStudentReportResult> {
  return executeTenantService(input, async () => {
    const student = await requireStudentForSchool(getPrismaClient(), input);
    const report = await buildAttendanceReport(input, student.id);
    return {
      studentId: student.id,
      studentNumber: student.studentNumber,
      studentName: `${student.firstName} ${student.lastName}`,
      report,
    };
  });
}

export function getAttendanceSessionReport(
  input: { schoolId: string; auth: TrustedAuthContext; sessionId: string },
): Promise<AttendanceSessionReportResult> {
  return executeTenantService(input, async () => {
    requireSchoolAccess(input.auth, input.schoolId);
    const session = await requireClassSessionForSchool(getPrismaClient(), input);
    const localDate = localDateForInstant(
      session.scheduledStart,
      (await requireSchoolSettingsForSchool(getPrismaClient(), input)).timezone,
    );
    const report = await buildAttendanceReport({
      schoolId: input.schoolId,
      auth: input.auth,
      filters: {
        termId: session.termId,
        classroomId: session.classroomId,
        subjectId: session.subjectId,
        teacherId: session.teacherId,
        from: localDate,
        to: localDate,
      },
    });
    const sessionRow = report.sessions.find(({ sessionId }) => sessionId === session.id);
    if (!sessionRow) throw domainError("NOT_FOUND", "Attendance session report was not found.");
    const roster = await getSessionAttendanceRoster({
      schoolId: input.schoolId,
      sessionId: session.id,
    });
    return {
      session: sessionRow,
      students: roster.students.map((student) => ({
        studentId: student.studentId,
        studentNumber: student.studentNumber,
        studentName: `${student.firstName} ${student.lastName}`,
        status: student.status,
        note: student.note,
      })),
    };
  });
}

function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function createAttendanceReportCsv(report: AttendanceReportResult): string {
  const header = [
    "ขอบเขต",
    "ภาคเรียน",
    "วันที่เริ่ม",
    "วันที่สิ้นสุด",
    "ตัวกรองชั้นเรียน",
    "ตัวกรองวิชา",
    "ตัวกรองครู",
    "รหัสนักเรียน",
    "ชื่อนักเรียน",
    "ชั้นเรียน",
    "วิชา",
    "จำนวนคาบ",
    "มา",
    "สาย",
    "ขาด",
    "ลา",
    "ยังไม่บันทึก",
    "ร้อยละการเข้าเรียน",
  ];
  const rows = report.students.map((student) => [
    report.scopeLabel,
    report.termName,
    report.from,
    report.to,
    report.filters.classroomId ?? "ทั้งหมด",
    report.filters.subjectId ?? "ทั้งหมด",
    report.filters.teacherId ?? "ทั้งหมด",
    student.studentNumber,
    student.studentName,
    student.classroomName,
    student.subjectName,
    student.sessionCount,
    student.totals.present,
    student.totals.late,
    student.totals.absent,
    student.totals.leave,
    student.totals.unrecorded,
    student.attendancePercentage,
  ]);
  return `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
