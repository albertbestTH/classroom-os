import type {
  TodayClassResult,
  TodayTimetableResult,
  UserRole,
} from "@classroom-os/types";

import { getPrismaClient } from "../client.js";
import { listClassSessionsForSchool, requireClassSessionDetailsForSchool } from "../repositories/session.repository.js";
import { requireSchoolSettingsForSchool } from "../repositories/reference.repository.js";
import { listTimetableEntriesForSchool } from "../repositories/timetable.repository.js";
import { listCoveragesForSchool } from "../repositories/timetable-coverage.repository.js";
import { listAcademicYears, listTerms } from "./academic-calendar.service.js";
import { executeTenantService, toClassSessionResult, toTimetableEntryResult } from "./service-utils.js";
import { isoWeekday, localDateTimeToInstant, schoolDayBounds } from "./timezone.js";
import { toTimetableCoverageResult } from "./timetable-coverage.service.js";

export function getTodayTimetable(input: {
  schoolId: string;
  role: UserRole;
  teacherId: string | null;
  now?: Date;
}): Promise<TodayTimetableResult> {
  return executeTenantService(input, async () => {
    const prisma = getPrismaClient();
    const school = await requireSchoolSettingsForSchool(prisma, input);
    const day = schoolDayBounds(school.timezone, input.now);
    const years = await listAcademicYears({ schoolId: input.schoolId });
    const terms = await listTerms({ schoolId: input.schoolId });
    const currentAcademicYear = years.find((year) => year.isCurrent) ?? null;
    const currentTerm =
      terms.find(
        (term) =>
          term.isCurrent &&
          (!currentAcademicYear || term.academicYearId === currentAcademicYear.id),
      ) ?? null;
    if (!currentTerm) {
      return {
        localDate: day.localDate,
        timezone: school.timezone,
        currentAcademicYear,
        currentTerm: null,
        classes: [],
        nextClass: null,
        completedCount: 0,
        cancelledCount: 0,
        missedCount: 0,
        incompleteAttendanceCount: 0,
      };
    }
    const teacherId = input.role === "TEACHER" ? input.teacherId ?? undefined : undefined;
    const allEntries = await listTimetableEntriesForSchool(prisma, {
        schoolId: input.schoolId,
        termId: currentTerm.id,
      });
    const coverages = teacherId
      ? await listCoveragesForSchool(prisma, {
          schoolId: input.schoolId,
          teacherId,
          localDate: new Date(`${day.localDate}T00:00:00.000Z`),
          status: "active",
        })
      : [];
    const coveredAwayIds = new Set(coverages.flatMap((coverage) => {
      if (coverage.originalTeacherId === teacherId) return [coverage.timetableEntryId];
      if (coverage.kind === "swap" && coverage.substituteTeacherId === teacherId && coverage.reciprocalEntryId) return [coverage.reciprocalEntryId];
      return [];
    }));
    const coveredForIds = new Set(coverages.flatMap((coverage) => {
      if (coverage.substituteTeacherId === teacherId) return [coverage.timetableEntryId];
      if (coverage.kind === "swap" && coverage.originalTeacherId === teacherId && coverage.reciprocalEntryId) return [coverage.reciprocalEntryId];
      return [];
    }));
    const entries = teacherId
      ? allEntries.filter((entry) =>
          (!coveredAwayIds.has(entry.id) && entry.teacherId === teacherId) || coveredForIds.has(entry.id),
        )
      : allEntries;
    const sessions = await listClassSessionsForSchool(prisma, {
        schoolId: input.schoolId,
        startsAtOrAfter: day.startsAt,
        startsBefore: day.endsAt,
        take: 200,
      });
    const todayEntries = entries.filter(
      (entry) => entry.isActive && entry.weekday === isoWeekday(day.localDate),
    );
    const visibleEntryIds = new Set(todayEntries.map((entry) => entry.id));
    const detailedSessions = [];
    for (const session of sessions.filter((item) =>
      item.timetableEntryId ? visibleEntryIds.has(item.timetableEntryId) : false,
    )) {
      detailedSessions.push(
        await requireClassSessionDetailsForSchool(prisma, {
          schoolId: input.schoolId,
          sessionId: session.id,
        }),
      );
    }
    const byEntry = new Map(
      detailedSessions
        .filter((session) => session.timetableEntryId)
        .map((session) => [session.timetableEntryId!, session]),
    );
    const now = input.now ?? new Date();
    const classes: TodayClassResult[] = todayEntries.map((entry) => {
      const scheduledStart = localDateTimeToInstant(
        day.localDate,
        toTimetableEntryResult(entry).startTime,
        school.timezone,
      );
      const scheduledEnd = localDateTimeToInstant(
        day.localDate,
        toTimetableEntryResult(entry).endTime,
        school.timezone,
      );
      const session = byEntry.get(entry.id);
      const coverage = coverages.find((item) =>
        item.timetableEntryId === entry.id || item.reciprocalEntryId === entry.id,
      );
      const status = session?.status === "completed"
        ? "completed"
        : session?.status === "live"
          ? "live"
          : session?.status === "cancelled"
            ? "cancelled"
          : scheduledEnd < now
            ? "missed"
            : "scheduled";
      return {
        timetableEntry: toTimetableEntryResult(entry),
        session: session ? toClassSessionResult(session) : null,
        status,
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: scheduledEnd.toISOString(),
        coverage: coverage ? toTimetableCoverageResult(coverage) : null,
      };
    });
    classes.sort((left, right) => left.scheduledStart.localeCompare(right.scheduledStart));
    const nextClass =
      classes.find((item) => item.status === "live") ??
      classes.find((item) => item.status === "scheduled") ??
      null;
    return {
      localDate: day.localDate,
      timezone: school.timezone,
      currentAcademicYear,
      currentTerm,
      classes,
      nextClass,
      completedCount: classes.filter((item) => item.status === "completed").length,
      cancelledCount: classes.filter((item) => item.status === "cancelled").length,
      missedCount: classes.filter((item) => item.status === "missed").length,
      incompleteAttendanceCount: classes.filter(
        (item) =>
          item.session?.status === "completed" &&
          item.session.attendanceRecordedCount < item.session.enrolledStudentCount,
      ).length,
    };
  });
}
