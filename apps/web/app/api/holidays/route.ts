import {
  createSchoolHoliday,
  listSchoolHolidays,
  requireRole,
  trustedTenantInput,
} from "@classroom-os/database";
import { NextRequest } from "next/server";

import {
  optionalBoolean,
  optionalNullableString,
  requiredString,
  withAuthenticatedApi,
} from "@/lib/api";

export async function GET(request: NextRequest) {
  return withAuthenticatedApi(request, {}, async ({ context }) => {
    return listSchoolHolidays({
      schoolId: context.schoolId,
      from: request.nextUrl.searchParams.get("from") ?? undefined,
      to: request.nextUrl.searchParams.get("to") ?? undefined,
      isActive:
        request.nextUrl.searchParams.get("isActive") === null
          ? undefined
          : request.nextUrl.searchParams.get("isActive") === "true",
    });
  });
}

export async function POST(request: NextRequest) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context }, body = {}) => {
      requireRole(context, ["SCHOOL_OWNER", "ADMIN"]);
      return createSchoolHoliday(
        trustedTenantInput(context, {
          localDate: requiredString(body, "localDate"),
          name: requiredString(body, "name"),
          description: optionalNullableString(body, "description"),
          isActive: optionalBoolean(body, "isActive"),
        }),
      );
    },
    201,
  );
}
