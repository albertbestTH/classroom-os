import { requireRole, trustedTenantInput, updateSubject } from "@classroom-os/database";
import { NextRequest } from "next/server";

import { optionalBoolean, optionalString, withAuthenticatedApi } from "@/lib/api";

type SubjectRouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, route: SubjectRouteContext) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context }, body = {}) => {
      requireRole(context, ["SCHOOL_OWNER", "ADMIN"]);
      const { id } = await route.params;
      return updateSubject(
        trustedTenantInput(context, {
          subjectId: id,
          code: optionalString(body, "code"),
          name: optionalString(body, "name"),
          isActive: optionalBoolean(body, "isActive"),
        }),
      );
    },
  );
}
