import {
  listTimetableCoverages,
  requestTimetableCoverage,
} from "@classroom-os/database";
import type { TimetableCoverageKind } from "@classroom-os/types";
import { NextRequest } from "next/server";

import { optionalNullableString, requiredString, withAuthenticatedApi } from "@/lib/api";

export async function GET(request: NextRequest) {
  return withAuthenticatedApi(request, {}, async ({ context }) =>
    listTimetableCoverages({
      schoolId: context.schoolId,
      teacherId: context.role === "TEACHER" ? context.teacherId ?? undefined : undefined,
      localDate: request.nextUrl.searchParams.get("localDate") ?? undefined,
    }),
  );
}

export async function POST(request: NextRequest) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context }, body = {}) => requestTimetableCoverage({
      schoolId: context.schoolId,
      actorUserId: context.userId,
      actorRole: context.role,
      actorTeacherId: context.teacherId,
      timetableEntryId: requiredString(body, "timetableEntryId"),
      substituteTeacherId: requiredString(body, "substituteTeacherId"),
      localDate: requiredString(body, "localDate"),
      kind: requiredString(body, "kind") as TimetableCoverageKind,
      reciprocalEntryId: optionalNullableString(body, "reciprocalEntryId"),
      reason: optionalNullableString(body, "reason"),
    }),
    201,
  );
}
