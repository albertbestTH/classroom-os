import {
  createSubject,
  listSubjects,
  requireRole,
  trustedTenantInput,
} from "@classroom-os/database";
import { NextRequest } from "next/server";

import { optionalBoolean, requiredString, withAuthenticatedApi } from "@/lib/api";

export async function GET(request: NextRequest) {
  return withAuthenticatedApi(request, {}, async ({ context }) => {
    requireRole(context, ["SCHOOL_OWNER", "ADMIN"]);
    const status = request.nextUrl.searchParams.get("isActive");
    return listSubjects({
      schoolId: context.schoolId,
      isActive: status === "true" ? true : status === "false" ? false : undefined,
    });
  });
}

export async function POST(request: NextRequest) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context }, body = {}) => {
      requireRole(context, ["SCHOOL_OWNER", "ADMIN"]);
      return createSubject(
        trustedTenantInput(context, {
          code: requiredString(body, "code"),
          name: requiredString(body, "name"),
          isActive: optionalBoolean(body, "isActive"),
        }),
      );
    },
    201,
  );
}
