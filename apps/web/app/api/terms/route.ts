import { createTerm, listTerms, requireRole, trustedTenantInput } from "@classroom-os/database";
import { NextRequest } from "next/server";

import { optionalBoolean, requiredString, withAuthenticatedApi } from "@/lib/api";

export async function GET(request: NextRequest) {
  return withAuthenticatedApi(request, {}, async ({ context }) => {
    requireRole(context, ["SCHOOL_OWNER", "ADMIN"]);
    return listTerms({
      schoolId: context.schoolId,
      academicYearId: request.nextUrl.searchParams.get("academicYearId") ?? undefined,
    });
  });
}

export async function POST(request: NextRequest) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context }, body = {}) => {
      requireRole(context, ["SCHOOL_OWNER", "ADMIN"]);
      return createTerm(
        trustedTenantInput(context, {
          academicYearId: requiredString(body, "academicYearId"),
          name: requiredString(body, "name"),
          startsOn: requiredString(body, "startsOn"),
          endsOn: requiredString(body, "endsOn"),
          isCurrent: optionalBoolean(body, "isCurrent"),
        }),
      );
    },
    201,
  );
}
