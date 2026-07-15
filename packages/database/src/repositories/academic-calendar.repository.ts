import type { Prisma, PrismaClient } from "../generated/prisma/client.js";
import {
  requireRecordId,
  requireSchoolId,
  rethrowScopedMutationError,
  TenantRecordNotFoundError,
  type TenantScope,
} from "../tenant.js";

type CalendarClient = Pick<PrismaClient, "academicYear" | "term">;

export function listAcademicYearsForSchool(client: CalendarClient, scope: TenantScope) {
  const schoolId = requireSchoolId(scope);
  return client.academicYear.findMany({
    where: { schoolId },
    include: { _count: { select: { terms: true } } },
    orderBy: [{ startsOn: "desc" }, { name: "asc" }],
  });
}

export async function requireAcademicYearForSchool(
  client: CalendarClient,
  input: TenantScope & { academicYearId: string },
) {
  const schoolId = requireSchoolId(input);
  const academicYearId = requireRecordId(input.academicYearId, "academicYearId");
  const year = await client.academicYear.findUnique({
    where: { id: academicYearId, schoolId },
    include: {
      terms: { select: { id: true, startsOn: true, endsOn: true } },
      _count: { select: { terms: true } },
    },
  });
  if (!year) throw new TenantRecordNotFoundError("Academic year");
  return year;
}

export function createAcademicYearForSchool(
  client: CalendarClient,
  input: TenantScope &
    Pick<Prisma.AcademicYearCreateManyInput, "name" | "startsOn" | "endsOn" | "isCurrent">,
) {
  const schoolId = requireSchoolId(input);
  return client.academicYear.create({
    data: {
      schoolId,
      name: input.name,
      startsOn: input.startsOn,
      endsOn: input.endsOn,
      isCurrent: input.isCurrent,
    },
    include: { _count: { select: { terms: true } } },
  });
}

export async function updateAcademicYearForSchool(
  client: CalendarClient,
  input: TenantScope & {
    academicYearId: string;
    data: Pick<Prisma.AcademicYearUpdateInput, "name" | "startsOn" | "endsOn" | "isCurrent">;
  },
) {
  const schoolId = requireSchoolId(input);
  const academicYearId = requireRecordId(input.academicYearId, "academicYearId");
  try {
    return await client.academicYear.update({
      where: { id: academicYearId, schoolId },
      data: input.data,
      include: { _count: { select: { terms: true } } },
    });
  } catch (error) {
    rethrowScopedMutationError(error, "Academic year");
  }
}

export function listTermsForSchool(
  client: CalendarClient,
  input: TenantScope & { academicYearId?: string },
) {
  const schoolId = requireSchoolId(input);
  return client.term.findMany({
    where: { schoolId, ...(input.academicYearId ? { academicYearId: input.academicYearId } : {}) },
    include: { academicYear: { select: { name: true, startsOn: true, endsOn: true } } },
    orderBy: [{ startsOn: "desc" }, { name: "asc" }],
  });
}

export async function requireTermForSchool(
  client: CalendarClient,
  input: TenantScope & { termId: string },
) {
  const schoolId = requireSchoolId(input);
  const termId = requireRecordId(input.termId, "termId");
  const term = await client.term.findUnique({
    where: { id: termId, schoolId },
    include: { academicYear: { select: { name: true, startsOn: true, endsOn: true } } },
  });
  if (!term) throw new TenantRecordNotFoundError("Term");
  return term;
}

export function createTermForSchool(
  client: CalendarClient,
  input: TenantScope &
    Pick<
      Prisma.TermCreateManyInput,
      "academicYearId" | "name" | "startsOn" | "endsOn" | "isCurrent"
    >,
) {
  const schoolId = requireSchoolId(input);
  return client.term.create({
    data: {
      schoolId,
      academicYearId: input.academicYearId,
      name: input.name,
      startsOn: input.startsOn,
      endsOn: input.endsOn,
      isCurrent: input.isCurrent,
    },
    include: { academicYear: { select: { name: true, startsOn: true, endsOn: true } } },
  });
}

export async function updateTermForSchool(
  client: CalendarClient,
  input: TenantScope & {
    termId: string;
    data: Pick<Prisma.TermUpdateInput, "name" | "startsOn" | "endsOn" | "isCurrent">;
  },
) {
  const schoolId = requireSchoolId(input);
  const termId = requireRecordId(input.termId, "termId");
  try {
    return await client.term.update({
      where: { id: termId, schoolId },
      data: input.data,
      include: { academicYear: { select: { name: true, startsOn: true, endsOn: true } } },
    });
  } catch (error) {
    rethrowScopedMutationError(error, "Term");
  }
}

export async function prepareCurrentAcademicYearForSchool(
  client: CalendarClient,
  input: TenantScope & { academicYearId: string },
): Promise<void> {
  const schoolId = requireSchoolId(input);
  await client.academicYear.updateMany({
    where: { schoolId, id: { not: input.academicYearId }, isCurrent: true },
    data: { isCurrent: false },
  });
  await client.term.updateMany({
    where: { schoolId, academicYearId: { not: input.academicYearId }, isCurrent: true },
    data: { isCurrent: false },
  });
}

export async function prepareCurrentTermForSchool(
  client: CalendarClient,
  input: TenantScope & { academicYearId: string },
): Promise<void> {
  const schoolId = requireSchoolId(input);
  await client.term.updateMany({ where: { schoolId, isCurrent: true }, data: { isCurrent: false } });
  await client.academicYear.updateMany({
    where: { schoolId, id: { not: input.academicYearId }, isCurrent: true },
    data: { isCurrent: false },
  });
  await client.academicYear.update({
    where: { id: input.academicYearId, schoolId },
    data: { isCurrent: true },
  });
}
