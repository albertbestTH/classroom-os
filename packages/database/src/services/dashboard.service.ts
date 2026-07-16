import type {
  AttendanceStatusTotals,
  DashboardActionItem,
  DashboardClassroomComparison,
  DashboardOverviewFilters,
  DashboardOverviewResult,
  DashboardRepeatedAbsence,
  DashboardTrendPoint,
  TodayClassResult,
  TrustedAuthContext,
} from "@classroom-os/types";

import { requireSchoolAccess } from "../auth/authorization.js";
import { authError } from "../auth/auth-errors.js";
import { dashboardOverviewFiltersSchema } from "../validation.js";
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
    (!filters.teacherId || timetableEntry.teacherId === filters.teacherId));
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

    const days = auth.role === "TEACHER" ? 7 : (parsed.days ?? 7);
    const filters: DashboardOverviewFilters = {
      days,
      ...(parsed.classroomId ? { classroomId: parsed.classroomId } : {}),
      ...(auth.role !== "TEACHER" && parsed.teacherId ? { teacherId: parsed.teacherId } : {}),
    };
    const now = input.now ?? new Date();
    const today = await getTodayTimetable({
      schoolId: input.schoolId,
      role: auth.role,
      teacherId: auth.teacherId,
      now,
    });
    const to = localDateForInstant(now, today.timezone);
    const from = addLocalDays(to, -(days - 1));
    const report = today.currentTerm
      ? await getAttendanceReport({
          schoolId: input.schoolId,
          auth,
          filters: {
            termId: today.currentTerm.id,
            classroomId: filters.classroomId,
            teacherId: filters.teacherId,
            from,
            to,
          },
          now,
        })
      : null;
    const todayReport = report
      ? await getAttendanceReport({
          schoolId: input.schoolId,
          auth,
          filters: {
            termId: report.termId,
            classroomId: filters.classroomId,
            teacherId: filters.teacherId,
            from: to,
            to,
          },
          now,
        })
      : null;

    const visibleClasses = filterTodayClasses(today.classes, filters);
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

    const classroomOptions = new Map<string, string>();
    const teacherOptions = new Map<string, string>();
    for (const session of report?.sessions ?? []) {
      classroomOptions.set(session.classroomId, session.classroomName);
      teacherOptions.set(session.teacherId, session.teacherName);
    }
    visibleClasses.forEach(({ timetableEntry }) => {
      classroomOptions.set(timetableEntry.classroomId, timetableEntry.classroomName);
      teacherOptions.set(timetableEntry.teacherId, timetableEntry.teacherName);
    });

    return {
      scope: auth.role === "TEACHER" ? "ASSIGNED_CLASSES" : "SCHOOL_WIDE",
      scopeLabel:
        auth.role === "TEACHER"
          ? "เฉพาะชั้นเรียนที่ได้รับมอบหมาย"
          : "ภาพรวมทั้งโรงเรียน",
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
        classrooms: [...classroomOptions].map(([id, label]) => ({ id, label })),
        teachers: [...teacherOptions].map(([id, label]) => ({ id, label })),
      },
    };
  });
}
