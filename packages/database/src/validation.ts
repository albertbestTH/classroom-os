import {
  ASSESSMENT_TYPES,
  ATTENDANCE_STATUSES,
} from "@classroom-os/types";
import { z } from "zod";

const trimmedText = (label: string) =>
  z.string().trim().min(1, `${label} must not be empty.`);
const uuid = (label: string) => z.string().uuid(`${label} must be a valid UUID.`);
const nullableTrimmedText = z.string().trim().min(1).nullable().optional();
const isoDate = z.string().date();
const isoDateTime = z.string().datetime({ offset: true });
const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must use HH:mm format.");

const tenantFields = {
  schoolId: uuid("schoolId"),
  actorUserId: uuid("actorUserId").nullable().optional(),
};

export const normalizedEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Email must be valid.");

export const createStudentSchema = z.object({
  ...tenantFields,
  studentNumber: trimmedText("studentNumber"),
  firstName: trimmedText("firstName"),
  lastName: trimmedText("lastName"),
  preferredName: nullableTrimmedText,
  dateOfBirth: isoDate.nullable().optional(),
  isActive: z.boolean().optional(),
});

export const updateStudentSchema = z
  .object({
    ...tenantFields,
    studentId: uuid("studentId"),
    firstName: trimmedText("firstName").optional(),
    lastName: trimmedText("lastName").optional(),
    preferredName: nullableTrimmedText,
    dateOfBirth: isoDate.nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    ({ firstName, lastName, preferredName, dateOfBirth, isActive }) =>
      [firstName, lastName, preferredName, dateOfBirth, isActive].some(
        (value) => value !== undefined,
      ),
    { message: "At least one student field must be updated." },
  );

export const createClassroomSchema = z.object({
  ...tenantFields,
  code: trimmedText("code"),
  name: trimmedText("name"),
  gradeLevel: trimmedText("gradeLevel"),
  homeroomTeacherId: uuid("homeroomTeacherId").nullable().optional(),
  isActive: z.boolean().optional(),
});

export const updateClassroomSchema = z
  .object({
    ...tenantFields,
    classroomId: uuid("classroomId"),
    name: trimmedText("name").optional(),
    gradeLevel: trimmedText("gradeLevel").optional(),
    homeroomTeacherId: uuid("homeroomTeacherId").nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    ({ name, gradeLevel, homeroomTeacherId, isActive }) =>
      [name, gradeLevel, homeroomTeacherId, isActive].some(
        (value) => value !== undefined,
      ),
    { message: "At least one classroom field must be updated." },
  );

const timetableFields = {
  teacherId: uuid("teacherId"),
  classroomId: uuid("classroomId"),
  subjectId: uuid("subjectId"),
  weekday: z.number().int().min(1).max(5),
  startTime: time,
  endTime: time,
  room: nullableTrimmedText,
};

export const createTimetableEntrySchema = z
  .object({
    ...tenantFields,
    termId: uuid("termId"),
    ...timetableFields,
  })
  .refine(({ startTime, endTime }) => startTime < endTime, {
    path: ["endTime"],
    message: "endTime must be later than startTime.",
  });

export const updateTimetableEntrySchema = z
  .object({
    ...tenantFields,
    timetableEntryId: uuid("timetableEntryId"),
    teacherId: timetableFields.teacherId.optional(),
    classroomId: timetableFields.classroomId.optional(),
    subjectId: timetableFields.subjectId.optional(),
    weekday: timetableFields.weekday.optional(),
    startTime: timetableFields.startTime.optional(),
    endTime: timetableFields.endTime.optional(),
    room: nullableTrimmedText,
    isActive: z.boolean().optional(),
  })
  .refine(
    ({ teacherId, classroomId, subjectId, weekday, startTime, endTime, room, isActive }) =>
      [teacherId, classroomId, subjectId, weekday, startTime, endTime, room, isActive].some(
        (value) => value !== undefined,
      ),
    { message: "At least one timetable field must be updated." },
  )
  .refine(
    ({ startTime, endTime }) => !startTime || !endTime || startTime < endTime,
    {
      path: ["endTime"],
      message: "endTime must be later than startTime.",
    },
  );

export const createClassSessionSchema = z
  .object({
    ...tenantFields,
    timetableEntryId: uuid("timetableEntryId"),
    scheduledStart: isoDateTime,
    scheduledEnd: isoDateTime,
    notes: nullableTrimmedText,
  })
  .refine(
    ({ scheduledStart, scheduledEnd }) =>
      Date.parse(scheduledStart) < Date.parse(scheduledEnd),
    { path: ["scheduledEnd"], message: "scheduledEnd must follow scheduledStart." },
  );

export const startClassSessionSchema = z.object({
  ...tenantFields,
  sessionId: uuid("sessionId"),
  startedAt: isoDateTime.optional(),
});

export const endClassSessionSchema = z.object({
  ...tenantFields,
  sessionId: uuid("sessionId"),
  endedAt: isoDateTime.optional(),
});

export const updateAttendanceBatchSchema = z
  .object({
    ...tenantFields,
    sessionId: uuid("sessionId"),
    records: z
      .array(
        z.object({
          studentId: uuid("studentId"),
          status: z.enum(ATTENDANCE_STATUSES),
          note: nullableTrimmedText,
        }),
      )
      .min(1)
      .max(200),
  })
  .superRefine(({ records }, context) => {
    const ids = new Set<string>();
    records.forEach(({ studentId }, index) => {
      if (ids.has(studentId)) {
        context.addIssue({
          code: "custom",
          path: ["records", index, "studentId"],
          message: "Student IDs must not be duplicated in a batch.",
        });
      }
      ids.add(studentId);
    });
  });

export const createAssessmentSchema = z.object({
  ...tenantFields,
  termId: uuid("termId"),
  classroomId: uuid("classroomId"),
  subjectId: uuid("subjectId"),
  teacherId: uuid("teacherId"),
  classSessionId: uuid("classSessionId").nullable().optional(),
  title: trimmedText("title"),
  type: z.enum(ASSESSMENT_TYPES),
  maxScore: z.number().finite().positive().max(99_999.99),
  dueAt: isoDateTime.nullable().optional(),
});

export const updateScoreBatchSchema = z
  .object({
    ...tenantFields,
    assessmentId: uuid("assessmentId"),
    gradedById: uuid("gradedById").nullable().optional(),
    scores: z
      .array(
        z.object({
          studentId: uuid("studentId"),
          value: z.number().finite().min(0),
          feedback: nullableTrimmedText,
        }),
      )
      .min(1)
      .max(200),
  })
  .superRefine(({ scores }, context) => {
    const ids = new Set<string>();
    scores.forEach(({ studentId }, index) => {
      if (ids.has(studentId)) {
        context.addIssue({
          code: "custom",
          path: ["scores", index, "studentId"],
          message: "Student IDs must not be duplicated in a batch.",
        });
      }
      ids.add(studentId);
    });
  });
