import type {
  AttendanceStatusTotals,
  DashboardActionItem,
  DashboardClassroomComparison,
  DashboardOverviewFilters,
  DashboardOverviewResult,
  DashboardRepeatedAbsence,
  DashboardTrendPoint,
  TeachingContext,
  TodayClassResult,
  TrustedAuthContext,
} from "@classroom-os/types";

import { requireSchoolAccess } from "../auth/authorization.js";
import { authError } from "../auth/auth-errors.js";
import { domainError } from "../domain-errors.js";
import { dashboardOverviewFiltersSchema } from "../validation.js";
import { listTeachingAssignments } from "./account.service.js";
import { getAttendanceReport } from "./attendance-report.service.js";
import { executeTenantService } from "./service-utils.js";
import { getTodayTimetable } from "./today.service.js";
import { addLocalDays, localDateForInstant } from "./timezone.js";

type DashboardInput = {
  schoolId: string;
  auth: TrustedAuthContext;
  filters?: DashboardOverviewFilters;
  now?: Date;
};

const emptyTotals = (): AttendanceStatusTotals => ({
  present: 0,
  late: 0,
  absent: 0,
  leave: 0,
  unrecorded: 0,
});

function addTotals(target: AttendanceStatusTotals, source: AttendanceStatusTotals) {
  target.present += source.present;
  target.late += source.late;
  target.absent += source.absent;
  target.leave += source.leave;
  target.unrecorded += source.unrecorded;
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Math.round((numerator / denominator) * 10_000) / 100;
}

function dashboardPercentage(totals: AttendanceStatusTotals): number {
  const eligible = Object.values(totals).reduce((sum, value) => sum + value, 0);
  return ratio(totals.present + totals.late, eligible);
}

function filterTodayClasses(
  classes: TodayClassResult[],
  filters: DashboardOverviewFilters,
): TodayClassResult[] {
  return classes.filter(({ timetableEntry }) =>
    (!filters.classroomId || timetableEntry.classroomId === filters.classroomId) &&
    (!filters.subjectId || timetableEntry.subjectId === filters.subjectId) &&
    (!filters.teacherId || timetableEntry.teacherId === filters.teacherId));
}

function toTeachingContext(
  assignment: Awaited<ReturnType<typeof listTeachingAssignments>>[number],
): TeachingContext {
  return {
    academicYearId: assignment.academicYearId,
    academicYearName: assignment.academicYearName,
    termId: assignment.termId,
    termName: assignment.termName,
    teachingAssignmentId: assignment.id,
    teacherId: assignment.teacherId,
    teacherName: assignment.teacherName,
    classroomId: assignment.classroomId,
    classroomName: assignment.classroomName,
    subjectId: assignment.subjectId,
    subjectName: assignment.subjectName,
  };
}

function classHref(item: TodayClassResult): string {
  return item.session ? `/sessions/${item.session.id}` : "/timetable";
}

export function getDashboardOverview(input: DashboardInput): Promise<DashboardOverviewResult> {
  return executeTenantService(input, async () => {
    const auth = requireSchoolAccess(input.auth, input.schoolId);
    const parsed = dashboardOverviewFiltersSchema.parse(input.filters ?? {});
    if (auth.role === "TEACHER" && parsed.teacherId) {
      throw authError("FORBIDDEN", "Teachers cannot select another teacher scope.");
    }
    if (auth.role === "TEACHER" && parsed.days === 30) {
      throw authError("FORBIDDEN", "The 30-day school view is available to managers only.");
    }
    if (auth.role === "TEACHER" && parsed.termId) {
      throw authError("FORBIDDEN", "Teachers use the current assigned term from their trusted context.");
    }

    const days = auth.role === "TEACHER" ? 7 : (parsed.days ?? 7);
    const now = input.now ?? new Date();
    const today = await getTodayTimetable({
      schoolId: input.schoolId,
      role: auth.role,
      teacherId: auth.teacherId,
      now,
    });
    const assignments = await listTeachingAssignments({ auth });
    const allTeachingContexts = assignments.map(toTeachingContext);
    const selectedTermId = auth.role === "TEACHER"
      ? today.currentTerm?.id
      : (parsed.termId ?? today.currentTerm?.id ?? allTeachingContexts[0]?.termId);
    if (parsed.termId && !allTeachingContexts.some(({ termId }) => termId === parsed.termId)) {
      throw authError("FORBIDDEN", "The selected term is not available in this school teaching context.");
    }
    const availableTeachingContexts = allTeachingContexts.filter(({ termId }) => termId === selectedTermId);
    if (parsed.teacherId && !availableTeachingContexts.some(({ teacherId }) => teacherId === parsed.teacherId)) {
      throw authError("FORBIDDEN", "The selected teacher is not available in this school and term.");
    }
    const teacherScopedContexts = availableTeachingContexts.filter(
      ({ teacherId }) => !parsed.teacherId || teacherId === parsed.teacherId,
    );
    const matchingContexts = teacherScopedContexts.filter((context) =>
      (!parsed.teachingAssignmentId || context.teachingAssignmentId === parsed.teachingAssignmentId) &&
      (!parsed.classroomId || context.classroomId === parsed.classroomId) &&
      (!parsed.subjectId || context.subjectId === parsed.subjectId));
    const hasContextFilter = Boolean(parsed.teachingAssignmentId || parsed.classroomId || parsed.subjectId);
    if (hasContextFilter && matchingContexts.length === 0) {
      if (auth.role === "TEACHER") {
        throw authError("FORBIDDEN", "The selected teaching context is not assigned to this teacher.");
      }
      throw domainError("VALIDATION_ERROR", "The selected teacher, classroom, and subject are not one teaching assignment.");
    }
    const selectedTeachingContext =
      parsed.teachingAssignmentId ||
      (parsed.classroomId && matchingContexts.length === 1) ||
      (auth.role === "TEACHER" && !hasContextFilter && availableTeachingContexts.length === 1)
        ? matchingContexts[0] ?? availableTeachingContexts[0] ?? null
        : null;
    const selectedTeacherId = selectedTeachingContext?.teacherId ?? parsed.teacherId;
    const selectedTeacherContext = selectedTeacherId
      ? availableTeachingContexts.find(({ teacherId }) => teacherId === selectedTeacherId) ?? null
      : null;
    const classroomId = selectedTeachingContext?.classroomId ?? parsed.classroomId;
    const subjectId = selectedTeachingContext?.subjectId ?? parsed.subjectId;
    const teacherId = auth.role === "TEACHER"
      ? undefined
      : selectedTeacherId;
    const filters: DashboardOverviewFilters = {
      days,
      ...(selectedTermId ? { termId: selectedTermId } : {}),
      ...(selectedTeachingContext ? { teachingAssignmentId: selectedTeachingContext.teachingAssignmentId } : {}),
      ...(classroomId ? { classroomId } : {}),
      ...(subjectId ? { subjectId } : {}),
      ...(teacherId ? { teacherId } : {}),
    };
    const isCurrentTerm = selectedTermId === today.currentTerm?.id;
    let to = localDateForInstant(now, today.timezone);
    if (selectedTermId && !isCurrentTerm) {
      const termRange = await getAttendanceReport({
        schoolId: input.schoolId,
        auth,
        filters: { termId: selectedTermId },
        now,
      });
      to = termRange.to;
    }
    const from = addLocalDays(to, -(days - 1));
    const report = selectedTermId
      ? await getAttendanceReport({
          schoolId: input.schoolId,
          auth,
          filters: {
            termId: selectedTermId,
            classroomId: filters.classroomId,
            subjectId: filters.subjectId,
            teacherId: filters.teacherId,
            from,
            to,
          },
          now,
        })
      : null;
    const todayReport = report && isCurrentTerm
      ? await getAttendanceReport({
          schoolId: input.schoolId,
          auth,
          filters: {
            termId: report.termId,
            classroomId: filters.classroomId,
            subjectId: filters.subjectId,
            teacherId: filters.teacherId,
            from: to,
            to,
          },
          now,
        })
      : null;

    const visibleClasses = isCurrentTerm ? filterTodayClasses(today.classes, filters) : [];
    const visibleToday = {
      ...today,
      classes: visibleClasses,
      nextClass: visibleClasses.find(({ status }) => status === "scheduled") ?? null,
      completedCount: visibleClasses.filter(({ status }) => status === "completed").length,
      cancelledCount: visibleClasses.filter(({ status }) => status === "cancelled").length,
      missedCount: visibleClasses.filter(({ status }) => status === "missed").length,
      incompleteAttendanceCount:
        todayReport?.sessions.filter(
          ({ status, recordedCount, enrolledCount }) =>
            (status === "live" || status === "completed") && recordedCount < enrolledCount,
        ).length ?? 0,
    };
    const liveSession = visibleClasses.find(({ status }) => status === "live") ?? null;

    const todayTotals = todayReport?.totals ?? emptyTotals();
    const eligibleCount = Object.values(todayTotals).reduce((sum, value) => sum + value, 0);
    const recordedCount = eligibleCount - todayTotals.unrecorded;
    const attendedCount = todayTotals.present + todayTotals.late;

    const sessionsByDate = new Map<string, NonNullable<typeof report>["sessions"]>();
    for (const session of report?.sessions ?? []) {
      const date = localDateForInstant(new Date(session.scheduledStart), today.timezone);
      const current = sessionsByDate.get(date) ?? [];
      current.push(session);
      sessionsByDate.set(date, current);
    }
    const trend: DashboardTrendPoint[] = Array.from({ length: days }, (_, index) => {
      const date = addLocalDays(from, index);
      const sessions = sessionsByDate.get(date) ?? [];
      const totals = emptyTotals();
      sessions.forEach((session) => addTotals(totals, session.totals));
      const pointEligible = Object.values(totals).reduce((sum, value) => sum + value, 0);
      const pointAttended = totals.present + totals.late;
      return {
        date,
        attendedCount: pointAttended,
        eligibleCount: pointEligible,
        percentage: pointEligible === 0 ? null : ratio(pointAttended, pointEligible),
        hasSessions: sessions.some(({ status }) => status !== "cancelled"),
      };
    });

    const comparisonMap = new Map<string, DashboardClassroomComparison & { totals: AttendanceStatusTotals }>();
    for (const session of report?.sessions ?? []) {
      const key = `${session.classroomId}:${session.subjectId}`;
      const current = comparisonMap.get(key) ?? {
        classroomId: session.classroomId,
        classroomName: session.classroomName,
        subjectId: session.subjectId,
        subjectName: session.subjectName,
        teacherId: session.teacherId,
        teacherName: session.teacherName,
        attendedCount: 0,
        eligibleCount: 0,
        attendancePercentage: null,
        totals: emptyTotals(),
      };
      addTotals(current.totals, session.totals);
      comparisonMap.set(key, current);
    }
    const classrooms = [...comparisonMap.values()]
      .map(({ totals, ...row }) => {
        const rowEligible = Object.values(totals).reduce((sum, value) => sum + value, 0);
        const rowAttended = totals.present + totals.late;
        return {
          ...row,
          eligibleCount: rowEligible,
          attendedCount: rowAttended,
          attendancePercentage: rowEligible === 0 ? null : ratio(rowAttended, rowEligible),
        };
      })
      .sort((left, right) =>
        left.classroomName.localeCompare(right.classroomName, "th") ||
        left.subjectName.localeCompare(right.subjectName, "th"),
      );

    const repeatedAbsences: DashboardRepeatedAbsence[] = (report?.students ?? [])
      .filter(({ totals }) => totals.absent >= 2)
      .map((student) => ({
        studentId: student.studentId,
        studentName: student.studentName,
        classroomId: student.classroomId,
        classroomName: student.classroomName,
        subjectId: student.subjectId,
        subjectName: student.subjectName,
        absenceCount: student.totals.absent,
      }))
      .sort((left, right) => right.absenceCount - left.absenceCount)
      .slice(0, 8);

    const actions: DashboardActionItem[] = [];
    if (liveSession) {
      actions.push({
        id: `live:${liveSession.session?.id ?? liveSession.timetableEntry.id}`,
        type: "LIVE_SESSION",
        priority: "high",
        title: "มีคาบเรียนกำลังดำเนินอยู่",
        description: `${liveSession.timetableEntry.classroomName} · ${liveSession.timetableEntry.subjectName}`,
        href: classHref(liveSession),
        classroomId: liveSession.timetableEntry.classroomId,
        subjectId: liveSession.timetableEntry.subjectId,
      });
    }
    for (const session of todayReport?.sessions ?? []) {
      if (session.status === "completed" && session.recordedCount < session.enrolledCount) {
        actions.push({
          id: `attendance:${session.sessionId}`,
          type: "INCOMPLETE_ATTENDANCE",
          priority: "high",
          title: "เช็กชื่อยังไม่ครบ",
          description: `${session.classroomName} · ${session.subjectName} บันทึก ${session.recordedCount}/${session.enrolledCount} คน`,
          href: `/sessions/${session.sessionId}/attendance`,
          classroomId: session.classroomId,
          subjectId: session.subjectId,
        });
      }
    }
    for (const item of visibleClasses.filter(({ status }) => status === "missed")) {
      actions.push({
        id: `missed:${item.timetableEntry.id}`,
        type: "MISSED_CLASS",
        priority: "high",
        title: "คาบเรียนเลยเวลาเริ่ม",
        description: `${item.timetableEntry.classroomName} · ${item.timetableEntry.subjectName}`,
        href: classHref(item),
        classroomId: item.timetableEntry.classroomId,
        subjectId: item.timetableEntry.subjectId,
      });
    }
    repeatedAbsences.forEach((student) => actions.push({
      id: `absence:${student.studentId}:${student.classroomId}:${student.subjectId}`,
      type: "REPEATED_ABSENCE",
      priority: "medium",
      title: `${student.studentName} ขาดเรียนซ้ำ`,
      description: `${student.classroomName} · ${student.subjectName} ขาด ${student.absenceCount} ครั้ง`,
      href: `/attendance?classroomId=${student.classroomId}`,
      classroomId: student.classroomId,
      subjectId: student.subjectId,
    }));
    for (const item of visibleClasses.filter(({ status }) => status === "cancelled")) {
      actions.push({
        id: `cancelled:${item.session?.id ?? item.timetableEntry.id}`,
        type: "CANCELLED_SESSION",
        priority: "low",
        title: "คาบเรียนถูกยกเลิก",
        description: `${item.timetableEntry.classroomName} · ${item.timetableEntry.subjectName}`,
        href: classHref(item),
        classroomId: item.timetableEntry.classroomId,
        subjectId: item.timetableEntry.subjectId,
      });
    }

    const termOptions = new Map(allTeachingContexts.map(({ termId, termName }) => [termId, termName]));
    const classroomOptions = new Map(availableTeachingContexts.map(({ classroomId, classroomName }) => [classroomId, classroomName]));
    const subjectOptions = new Map(availableTeachingContexts.map(({ subjectId, subjectName }) => [subjectId, subjectName]));
    const teacherOptions = new Map(availableTeachingContexts.map(({ teacherId, teacherName }) => [teacherId, teacherName]));
    const scope = auth.role === "TEACHER" ? "TEACHER" : filters.teacherId ? "TEACHER_FILTERED" : "SCHOOL";
    const scopeLabel = scope === "TEACHER"
      ? "ภาพรวมการสอนของฉัน"
      : scope === "TEACHER_FILTERED"
        ? `กำลังดูข้อมูลของครู: ${selectedTeacherContext?.teacherName ?? ""}`
        : "ภาพรวมทั้งโรงเรียน";

    return {
      scope,
      viewerRole: auth.role,
      scopeLabel,
      selectedTeacher: auth.role !== "TEACHER" && selectedTeacherContext
        ? { id: selectedTeacherContext.teacherId, label: selectedTeacherContext.teacherName }
        : null,
      availableTeachingContexts,
      selectedTeachingContext,
      timezone: today.timezone,
      localDate: today.localDate,
      from,
      to,
      days,
      filters,
      attendance: {
        totals: todayTotals,
        attendedCount,
        eligibleCount,
        recordedCount,
        attendancePercentage: dashboardPercentage(todayTotals),
        completionPercentage: ratio(recordedCount, eligibleCount),
      },
      sessionStatus: {
        scheduled: visibleClasses.filter(({ status }) => status === "scheduled").length,
        live: visibleClasses.filter(({ status }) => status === "live").length,
        completed: visibleClasses.filter(({ status }) => status === "completed").length,
        cancelled: visibleClasses.filter(({ status }) => status === "cancelled").length,
        missed: visibleClasses.filter(({ status }) => status === "missed").length,
        attendanceIncomplete: visibleToday.incompleteAttendanceCount,
      },
      trend,
      classrooms,
      nextClass: visibleToday.nextClass,
      liveSession,
      today: visibleToday,
      actions: actions.slice(0, 10),
      repeatedAbsences,
      filterOptions: {
        terms: [...termOptions].map(([id, label]) => ({ id, label })),
        classrooms: [...classroomOptions].map(([id, label]) => ({ id, label })),
        subjects: [...subjectOptions].map(([id, label]) => ({ id, label })),
        teachers: [...teacherOptions].map(([id, label]) => ({ id, label })),
      },
    };
  });
}
