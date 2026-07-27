import type {
  CreateSchoolHolidayInput,
  SchoolHolidayResult,
  TenantServiceInput,
  UpdateSchoolHolidayInput,
} from "@classroom-os/types";
import { z } from "zod";

import { getPrismaClient } from "../client.js";
import { domainError } from "../domain-errors.js";
import { createAuditLogForSchool } from "../repositories/audit.repository.js";
import {
  createSchoolHolidayForSchool,
  listSchoolHolidaysForSchool,
  requireSchoolHolidayForSchool,
  updateSchoolHolidayForSchool,
} from "../repositories/school-holiday.repository.js";
import { executeTenantService } from "./service-utils.js";

const uuid = z.string().uuid();
const isoDate = z.string().date();
const text = z.string().trim().min(1).max(120);
const nullableText = z.string().trim().min(1).max(500).nullable().optional();
const tenantFields = {
  schoolId: uuid,
  actorUserId: uuid.nullable().optional(),
};

const createHolidaySchema = z.object({
  ...tenantFields,
  localDate: isoDate,
  name: text,
  description: nullableText,
  isActive: z.boolean().optional(),
});

const updateHolidaySchema = z.object({
  ...tenantFields,
  holidayId: uuid,
  localDate: isoDate.optional(),
  name: text.optional(),
  description: nullableText,
  isActive: z.boolean().optional(),
}).refine(
  ({ localDate, name, description, isActive }) =>
    [localDate, name, description, isActive].some((value) => value !== undefined),
  { message: "At least one holiday field must be updated." },
);

const listHolidaySchema = z.object({
  ...tenantFields,
  from: isoDate.optional(),
  to: isoDate.optional(),
  isActive: z.boolean().optional(),
}).refine(({ from, to }) => !from || !to || from <= to, {
  path: ["to"],
  message: "to must be on or after from.",
});

function dateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function toSchoolHolidayResult(holiday: {
  id: string;
  schoolId: string;
  localDate: Date;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): SchoolHolidayResult {
  return {
    id: holiday.id,
    schoolId: holiday.schoolId,
    localDate: holiday.localDate.toISOString().slice(0, 10),
    name: holiday.name,
    description: holiday.description,
    isActive: holiday.isActive,
    createdAt: holiday.createdAt.toISOString(),
    updatedAt: holiday.updatedAt.toISOString(),
  };
}

export function listSchoolHolidays(
  input: TenantServiceInput & { from?: string; to?: string; isActive?: boolean },
): Promise<SchoolHolidayResult[]> {
  return executeTenantService(input, async () => {
    const parsed = listHolidaySchema.parse(input);
    const holidays = await listSchoolHolidaysForSchool(getPrismaClient(), {
      schoolId: parsed.schoolId,
      from: parsed.from ? dateOnly(parsed.from) : undefined,
      to: parsed.to ? dateOnly(parsed.to) : undefined,
      isActive: parsed.isActive,
    });
    return holidays.map(toSchoolHolidayResult);
  });
}

export function createSchoolHoliday(
  input: CreateSchoolHolidayInput,
): Promise<SchoolHolidayResult> {
  return executeTenantService(input, async () => {
    const parsed = createHolidaySchema.parse(input);
    return getPrismaClient().$transaction(async (transaction) => {
      const holiday = await createSchoolHolidayForSchool(transaction, {
        schoolId: parsed.schoolId,
        data: {
          localDate: dateOnly(parsed.localDate),
          name: parsed.name,
          description: parsed.description ?? null,
          isActive: parsed.isActive ?? true,
        },
      });
      await createAuditLogForSchool(transaction, {
        schoolId: parsed.schoolId,
        actorUserId: parsed.actorUserId,
        action: "holiday.created",
        entityType: "SchoolHoliday",
        entityId: holiday.id,
        metadata: { localDate: parsed.localDate },
      });
      return toSchoolHolidayResult(holiday);
    });
  });
}

export function updateSchoolHoliday(
  input: UpdateSchoolHolidayInput,
): Promise<SchoolHolidayResult> {
  return executeTenantService(input, async () => {
    const parsed = updateHolidaySchema.parse(input);
    return getPrismaClient().$transaction(async (transaction) => {
      await requireSchoolHolidayForSchool(transaction, parsed);
      const holiday = await updateSchoolHolidayForSchool(transaction, {
        schoolId: parsed.schoolId,
        holidayId: parsed.holidayId,
        data: {
          ...(parsed.localDate !== undefined ? { localDate: dateOnly(parsed.localDate) } : {}),
          ...(parsed.name !== undefined ? { name: parsed.name } : {}),
          ...(parsed.description !== undefined ? { description: parsed.description } : {}),
          ...(parsed.isActive !== undefined ? { isActive: parsed.isActive } : {}),
        },
      });
      await createAuditLogForSchool(transaction, {
        schoolId: parsed.schoolId,
        actorUserId: parsed.actorUserId,
        action: "holiday.updated",
        entityType: "SchoolHoliday",
        entityId: holiday.id,
        metadata: { fields: Object.keys(parsed).filter((key) => !["schoolId", "actorUserId", "holidayId"].includes(key)) },
      });
      return toSchoolHolidayResult(holiday);
    });
  });
}

export function holidayConflictError(name: string): never {
  throw domainError("VALIDATION_ERROR", `This date is a school holiday: ${name}.`);
}
