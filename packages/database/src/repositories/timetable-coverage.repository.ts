import type { Prisma, PrismaClient, TimetableCoverage } from "../generated/prisma/client.js";

import { requireRecordId, requireSchoolId, TenantRecordNotFoundError, type TenantScope } from "../tenant.js";

type CoverageClient = Pick<PrismaClient, "timetableCoverage" | "timetableEntry" | "teacher" | "user">;

const coverageDetails = {
  originalTeacher: true,
  substituteTeacher: true,
} satisfies Prisma.TimetableCoverageInclude;

export type TimetableCoverageWithDetails = Prisma.TimetableCoverageGetPayload<{
  include: typeof coverageDetails;
}>;

export async function requireCoverageForSchool(
  client: CoverageClient,
  input: TenantScope & { coverageId: string },
): Promise<TimetableCoverageWithDetails> {
  const schoolId = requireSchoolId(input);
  const id = requireRecordId(input.coverageId, "coverageId");
  const coverage = await client.timetableCoverage.findUnique({
    where: { id, schoolId },
    include: coverageDetails,
  });
  if (!coverage) throw new TenantRecordNotFoundError("TimetableCoverage");
  return coverage;
}

export function listCoveragesForSchool(
  client: CoverageClient,
  input: TenantScope & {
    teacherId?: string;
    localDate?: Date;
    status?: "pending" | "active" | "declined" | "cancelled";
  },
): Promise<TimetableCoverageWithDetails[]> {
  const schoolId = requireSchoolId(input);
  return client.timetableCoverage.findMany({
    where: {
      schoolId,
      ...(input.localDate ? { localDate: input.localDate } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.teacherId
        ? { OR: [{ originalTeacherId: input.teacherId }, { substituteTeacherId: input.teacherId }] }
        : {}),
    },
    include: coverageDetails,
    orderBy: [{ localDate: "asc" }, { createdAt: "asc" }],
  });
}

export async function createCoverageForSchool(
  client: CoverageClient,
  input: TenantScope & {
    data: Omit<Prisma.TimetableCoverageUncheckedCreateInput, "schoolId">;
  },
): Promise<TimetableCoverageWithDetails> {
  const schoolId = requireSchoolId(input);
  return client.timetableCoverage.create({
    data: { schoolId, ...input.data },
    include: coverageDetails,
  });
}

export function updateCoverageForSchool(
  client: CoverageClient,
  input: TenantScope & {
    coverageId: string;
    data: Prisma.TimetableCoverageUncheckedUpdateInput;
  },
): Promise<TimetableCoverage> {
  const schoolId = requireSchoolId(input);
  const id = requireRecordId(input.coverageId, "coverageId");
  return client.timetableCoverage.update({ where: { id, schoolId }, data: input.data });
}

export async function findActiveCoverageAccess(
  client: CoverageClient,
  input: TenantScope & { teacherId: string; timetableEntryId: string; localDate: Date },
): Promise<TimetableCoverage | null> {
  const schoolId = requireSchoolId(input);
  return client.timetableCoverage.findFirst({
    where: {
      schoolId,
      localDate: input.localDate,
      status: "active",
      OR: [
        { timetableEntryId: input.timetableEntryId, substituteTeacherId: input.teacherId },
        { reciprocalEntryId: input.timetableEntryId, originalTeacherId: input.teacherId, kind: "swap" },
      ],
    },
  });
}
