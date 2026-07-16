import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  attendanceReportFiltersSchema,
  cancelClassSessionSchema,
  correctAttendanceSchema,
  createAssessmentSchema,
  createClassroomSchema,
  createStudentSchema,
  createTimetableEntrySchema,
  endClassSessionSchema,
  normalizedEmailSchema,
  startClassSessionSchema,
  updateAttendanceBatchSchema,
  updateClassroomSchema,
  updateScoreBatchSchema,
  updateStudentSchema,
  updateTimetableEntrySchema,
} from "../../src/validation.js";

const schoolId = randomUUID();
const studentId = randomUUID();

describe("service validation schemas", () => {
  it("trims names and normalizes email values", () => {
    const student = createStudentSchema.parse({
      schoolId,
      studentNumber: "  SYN-001  ",
      firstName: "  Synthetic  ",
      lastName: "  Learner  ",
    });

    expect(student.firstName).toBe("Synthetic");
    expect(normalizedEmailSchema.parse("  TEST@EXAMPLE.INVALID ")).toBe(
      "test@example.invalid",
    );
  });

  it("requires weekday and increasing timetable times", () => {
    const base = {
      schoolId,
      termId: randomUUID(),
      teacherId: randomUUID(),
      classroomId: randomUUID(),
      subjectId: randomUUID(),
    };

    expect(() =>
      createTimetableEntrySchema.parse({
        ...base,
        weekday: 0,
        startTime: "08:00",
        endTime: "09:00",
      }),
    ).toThrow();
    expect(() =>
      createTimetableEntrySchema.parse({
        ...base,
        weekday: 1,
        startTime: "09:00",
        endTime: "08:00",
      }),
    ).toThrow();
    expect(() =>
      updateTimetableEntrySchema.parse({
        schoolId,
        timetableEntryId: randomUUID(),
        startTime: "10:00",
        endTime: "09:00",
      }),
    ).toThrow();
  });

  it("requires non-empty classroom and student updates", () => {
    expect(() =>
      createClassroomSchema.parse({
        schoolId,
        code: "SYN-CLASS",
        name: "   ",
        gradeLevel: "TEST-5",
      }),
    ).toThrow();
    expect(() =>
      updateClassroomSchema.parse({
        schoolId,
        classroomId: randomUUID(),
      }),
    ).toThrow();
    expect(() =>
      updateStudentSchema.parse({ schoolId, studentId }),
    ).toThrow();
  });

  it("requires valid timestamps for session start and end", () => {
    expect(() =>
      startClassSessionSchema.parse({
        schoolId,
        sessionId: randomUUID(),
        startedAt: "not-a-date",
      }),
    ).toThrow();
    expect(() =>
      endClassSessionSchema.parse({
        schoolId,
        sessionId: randomUUID(),
        endedAt: "not-a-date",
      }),
    ).toThrow();
  });

  it("rejects non-positive assessment maximums", () => {
    expect(() =>
      createAssessmentSchema.parse({
        schoolId,
        termId: randomUUID(),
        classroomId: randomUUID(),
        subjectId: randomUUID(),
        teacherId: randomUUID(),
        title: "Synthetic quiz",
        type: "quiz",
        maxScore: 0,
      }),
    ).toThrow();
  });

  it("rejects duplicate student IDs and negative scores in batches", () => {
    expect(() =>
      updateAttendanceBatchSchema.parse({
        schoolId,
        sessionId: randomUUID(),
        records: [
          { studentId, status: "present" },
          { studentId, status: "late" },
        ],
      }),
    ).toThrow();
    expect(() =>
      updateScoreBatchSchema.parse({
        schoolId,
        assessmentId: randomUUID(),
        scores: [{ studentId, value: -1 }],
      }),
    ).toThrow();
  });

  it("requires bounded correction and cancellation reasons and ordered report dates", () => {
    expect(() => cancelClassSessionSchema.parse({ schoolId, sessionId: randomUUID(), reason: "  " })).toThrow();
    expect(() => correctAttendanceSchema.parse({ schoolId, sessionId: randomUUID(), studentId, status: "late", reason: "Synthetic correction", expectedRecordUpdatedAt: "not-a-date" })).toThrow();
    expect(() => attendanceReportFiltersSchema.parse({ from: "2026-07-20", to: "2026-07-19" })).toThrow();
  });
});
