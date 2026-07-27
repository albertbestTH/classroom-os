import type { Prisma, PrismaClient, SchoolHoliday } from "../generated/prisma/client.js";
import {
  requireRecordId,
  requireSchoolId,
  rethrowScopedMutationError,
  TenantRecordNotFoundError,
  type TenantScope,
} from "../tenant.js";

type HolidayClient = Pick<PrismaClient, "schoolHoliday">;

export async function listSchoolHolidaysForSchool(
  client: HolidayClient,
  input: TenantScope & { from?: Date; to?: Date; isActive?: boolean },
): Promise<SchoolHoliday[]> {
  const schoolId = requireSchoolId(input);
  return client.schoolHoliday.findMany({
    where: {
      schoolId,
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.from || input.to
        ? {
            localDate: {
              ...(input.from ? { gte: input.from } : {}),
              ...(input.to ? { lte: input.to } : {}),
            },
          }
        : {}),
    },
    orderBy: [{ localDate: "asc" }, { id: "asc" }],
  });
}

export async function findActiveSchoolHolidayForSchool(
  client: HolidayClient,
  input: TenantScope & { localDate: Date },
): Promise<SchoolHoliday | null> {
  const schoolId = requireSchoolId(input);
  return client.schoolHoliday.findFirst({
    where: {
      schoolId,
      localDate: input.localDate,
      isActive: true,
    },
  });
}

export async function requireSchoolHolidayForSchool(
  client: HolidayClient,
  input: TenantScope & { holidayId: string },
): Promise<SchoolHoliday> {
  const schoolId = requireSchoolId(input);
  const id = requireRecordId(input.holidayId, "holidayId");
  const holiday = await client.schoolHoliday.findUnique({ where: { id, schoolId } });
  if (!holiday) throw new TenantRecordNotFoundError("SchoolHoliday");
  return holiday;
}

export async function createSchoolHolidayForSchool(
  client: HolidayClient,
  input: TenantScope & { data: Omit<Prisma.SchoolHolidayUncheckedCreateInput, "schoolId"> },
): Promise<SchoolHoliday> {
  const schoolId = requireSchoolId(input);
  try {
    return await client.schoolHoliday.create({ data: { schoolId, ...input.data } });
  } catch (error) {
    rethrowScopedMutationError(error, "SchoolHoliday");
  }
}

export async function updateSchoolHolidayForSchool(
  client: HolidayClient,
  input: TenantScope & { holidayId: string; data: Prisma.SchoolHolidayUncheckedUpdateInput },
): Promise<SchoolHoliday> {
  const schoolId = requireSchoolId(input);
  const id = requireRecordId(input.holidayId, "holidayId");
  try {
    return await client.schoolHoliday.update({ where: { id, schoolId }, data: input.data });
  } catch (error) {
    rethrowScopedMutationError(error, "SchoolHoliday");
  }
}
