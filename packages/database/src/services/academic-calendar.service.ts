import type {
  AcademicYearResult,
  CreateAcademicYearInput,
  CreateTermInput,
  TenantServiceInput,
  TermResult,
  UpdateAcademicYearInput,
  UpdateTermInput,
} from "@classroom-os/types";
import { z } from "zod";

import { getPrismaClient } from "../client.js";
import { domainError } from "../domain-errors.js";
import {
  createAcademicYearForSchool,
  createTermForSchool,
  listAcademicYearsForSchool,
  listTermsForSchool,
  prepareCurrentAcademicYearForSchool,
  prepareCurrentTermForSchool,
  requireAcademicYearForSchool,
  requireTermForSchool,
  updateAcademicYearForSchool,
  updateTermForSchool,
} from "../repositories/academic-calendar.repository.js";
import { createAuditLogForSchool } from "../repositories/audit.repository.js";
import { executeTenantService } from "./service-utils.js";

const tenantFields = {
  schoolId: z.string().uuid(),
  actorUserId: z.string().uuid().nullable().optional(),
};
const date = z.string().date();
const createYearSchema = z
  .object({
    ...tenantFields,
    name: z.string().trim().min(1),
    startsOn: date,
    endsOn: date,
    isCurrent: z.boolean().optional(),
  })
  .refine(({ startsOn, endsOn }) => startsOn < endsOn, {
    path: ["endsOn"],
    message: "endsOn must be later than startsOn.",
  });
const updateYearSchema = z.object({
  ...tenantFields,
  academicYearId: z.string().uuid(),
  name: z.string().trim().min(1).optional(),
  startsOn: date.optional(),
  endsOn: date.optional(),
  isCurrent: z.boolean().optional(),
});
const createTermSchema = z
  .object({
    ...tenantFields,
    academicYearId: z.string().uuid(),
    name: z.string().trim().min(1),
    startsOn: date,
    endsOn: date,
    isCurrent: z.boolean().optional(),
  })
  .refine(({ startsOn, endsOn }) => startsOn < endsOn, {
    path: ["endsOn"],
    message: "endsOn must be later than startsOn.",
  });
const updateTermSchema = z.object({
  ...tenantFields,
  termId: z.string().uuid(),
  name: z.string().trim().min(1).optional(),
  startsOn: date.optional(),
  endsOn: date.optional(),
  isCurrent: z.boolean().optional(),
});

type YearRecord = {
  id: string;
  schoolId: string;
  name: string;
  startsOn: Date;
  endsOn: Date;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { terms: number };
};
type TermRecord = Awaited<ReturnType<typeof requireTermForSchool>>;

function day(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toAcademicYearResult(year: YearRecord): AcademicYearResult {
  return {
    id: year.id,
    schoolId: year.schoolId,
    name: year.name,
    startsOn: day(year.startsOn),
    endsOn: day(year.endsOn),
    isCurrent: year.isCurrent,
    termCount: year._count.terms,
    createdAt: year.createdAt.toISOString(),
    updatedAt: year.updatedAt.toISOString(),
  };
}

function toTermResult(term: TermRecord): TermResult {
  return {
    id: term.id,
    schoolId: term.schoolId,
    academicYearId: term.academicYearId,
    academicYearName: term.academicYear.name,
    name: term.name,
    startsOn: day(term.startsOn),
    endsOn: day(term.endsOn),
    isCurrent: term.isCurrent,
    createdAt: term.createdAt.toISOString(),
    updatedAt: term.updatedAt.toISOString(),
  };
}

function assertDateRange(startsOn: string, endsOn: string): void {
  if (startsOn >= endsOn) {
    throw domainError("VALIDATION_ERROR", "The start date must be before the end date.");
  }
}

function assertTermWithinYear(
  startsOn: string,
  endsOn: string,
  year: { startsOn: Date; endsOn: Date },
): void {
  if (startsOn < day(year.startsOn) || endsOn > day(year.endsOn)) {
    throw domainError("VALIDATION_ERROR", "The term dates must be within the academic year.");
  }
}

export function listAcademicYears(input: TenantServiceInput): Promise<AcademicYearResult[]> {
  return executeTenantService(input, async () => {
    const years = await listAcademicYearsForSchool(getPrismaClient(), input);
    return years.map(toAcademicYearResult);
  });
}

export function createAcademicYear(input: CreateAcademicYearInput): Promise<AcademicYearResult> {
  return executeTenantService(input, async () => {
    const parsed = createYearSchema.parse(input);
    return getPrismaClient().$transaction(async (transaction) => {
      if (parsed.isCurrent) {
        await prepareCurrentAcademicYearForSchool(transaction, {
          schoolId: parsed.schoolId,
          academicYearId: "00000000-0000-0000-0000-000000000000",
        });
      }
      const year = await createAcademicYearForSchool(transaction, {
        ...parsed,
        startsOn: new Date(`${parsed.startsOn}T00:00:00.000Z`),
        endsOn: new Date(`${parsed.endsOn}T00:00:00.000Z`),
      });
      await createAuditLogForSchool(transaction, {
        schoolId: parsed.schoolId,
        actorUserId: parsed.actorUserId,
        action: "academic_year.created",
        entityType: "AcademicYear",
        entityId: year.id,
        metadata: { isCurrent: year.isCurrent },
      });
      return toAcademicYearResult(year);
    });
  });
}

export function updateAcademicYear(input: UpdateAcademicYearInput): Promise<AcademicYearResult> {
  return executeTenantService(input, async () => {
    const parsed = updateYearSchema.parse(input);
    return getPrismaClient().$transaction(async (transaction) => {
      const current = await requireAcademicYearForSchool(transaction, parsed);
      const startsOn = parsed.startsOn ?? day(current.startsOn);
      const endsOn = parsed.endsOn ?? day(current.endsOn);
      assertDateRange(startsOn, endsOn);
      if (current.terms.some((term) => day(term.startsOn) < startsOn || day(term.endsOn) > endsOn)) {
        throw domainError("CONFLICT", "The academic year cannot exclude an existing term.");
      }
      if (parsed.isCurrent) await prepareCurrentAcademicYearForSchool(transaction, parsed);
      const { schoolId, actorUserId, academicYearId, ...data } = parsed;
      const year = await updateAcademicYearForSchool(transaction, {
        schoolId,
        academicYearId,
        data: {
          ...data,
          ...(data.startsOn ? { startsOn: new Date(`${data.startsOn}T00:00:00.000Z`) } : {}),
          ...(data.endsOn ? { endsOn: new Date(`${data.endsOn}T00:00:00.000Z`) } : {}),
        },
      });
      await createAuditLogForSchool(transaction, {
        schoolId,
        actorUserId,
        action: "academic_year.updated",
        entityType: "AcademicYear",
        entityId: year.id,
        metadata: { fields: Object.keys(data) },
      });
      return toAcademicYearResult(year);
    });
  });
}

export function listTerms(
  input: TenantServiceInput & { academicYearId?: string },
): Promise<TermResult[]> {
  return executeTenantService(input, async () => {
    const terms = await listTermsForSchool(getPrismaClient(), input);
    return terms.map(toTermResult);
  });
}

export function createTerm(input: CreateTermInput): Promise<TermResult> {
  return executeTenantService(input, async () => {
    const parsed = createTermSchema.parse(input);
    return getPrismaClient().$transaction(async (transaction) => {
      const year = await requireAcademicYearForSchool(transaction, parsed);
      assertTermWithinYear(parsed.startsOn, parsed.endsOn, year);
      if (parsed.isCurrent) await prepareCurrentTermForSchool(transaction, parsed);
      const term = await createTermForSchool(transaction, {
        ...parsed,
        startsOn: new Date(`${parsed.startsOn}T00:00:00.000Z`),
        endsOn: new Date(`${parsed.endsOn}T00:00:00.000Z`),
      });
      await createAuditLogForSchool(transaction, {
        schoolId: parsed.schoolId,
        actorUserId: parsed.actorUserId,
        action: "term.created",
        entityType: "Term",
        entityId: term.id,
        metadata: { academicYearId: term.academicYearId, isCurrent: term.isCurrent },
      });
      return toTermResult(term);
    });
  });
}

export function updateTerm(input: UpdateTermInput): Promise<TermResult> {
  return executeTenantService(input, async () => {
    const parsed = updateTermSchema.parse(input);
    return getPrismaClient().$transaction(async (transaction) => {
      const current = await requireTermForSchool(transaction, parsed);
      const startsOn = parsed.startsOn ?? day(current.startsOn);
      const endsOn = parsed.endsOn ?? day(current.endsOn);
      assertDateRange(startsOn, endsOn);
      assertTermWithinYear(startsOn, endsOn, current.academicYear);
      if (parsed.isCurrent) {
        await prepareCurrentTermForSchool(transaction, {
          schoolId: parsed.schoolId,
          academicYearId: current.academicYearId,
        });
      }
      const { schoolId, actorUserId, termId, ...data } = parsed;
      const term = await updateTermForSchool(transaction, {
        schoolId,
        termId,
        data: {
          ...data,
          ...(data.startsOn ? { startsOn: new Date(`${data.startsOn}T00:00:00.000Z`) } : {}),
          ...(data.endsOn ? { endsOn: new Date(`${data.endsOn}T00:00:00.000Z`) } : {}),
        },
      });
      await createAuditLogForSchool(transaction, {
        schoolId,
        actorUserId,
        action: "term.updated",
        entityType: "Term",
        entityId: term.id,
        metadata: { fields: Object.keys(data) },
      });
      return toTermResult(term);
    });
  });
}
