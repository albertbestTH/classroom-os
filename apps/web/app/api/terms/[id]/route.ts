import { requireRole, trustedTenantInput, updateTerm } from "@classroom-os/database";
import { NextRequest } from "next/server";

import { optionalBoolean, optionalString, withAuthenticatedApi } from "@/lib/api";

type TermRouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, route: TermRouteContext) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context }, body = {}) => {
      requireRole(context, ["SCHOOL_OWNER", "ADMIN"]);
      const { id } = await route.params;
      return updateTerm(
        trustedTenantInput(context, {
          termId: id,
          name: optionalString(body, "name"),
          startsOn: optionalString(body, "startsOn"),
          endsOn: optionalString(body, "endsOn"),
          isCurrent: optionalBoolean(body, "isCurrent"),
        }),
      );
    },
  );
}
