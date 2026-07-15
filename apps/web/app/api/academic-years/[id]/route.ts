import { requireRole, trustedTenantInput, updateAcademicYear } from "@classroom-os/database";
import { NextRequest } from "next/server";

import { optionalBoolean, optionalString, withAuthenticatedApi } from "@/lib/api";

type AcademicYearRouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, route: AcademicYearRouteContext) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context }, body = {}) => {
      requireRole(context, ["SCHOOL_OWNER", "ADMIN"]);
      const { id } = await route.params;
      return updateAcademicYear(
        trustedTenantInput(context, {
          academicYearId: id,
          name: optionalString(body, "name"),
          startsOn: optionalString(body, "startsOn"),
          endsOn: optionalString(body, "endsOn"),
          isCurrent: optionalBoolean(body, "isCurrent"),
        }),
      );
    },
  );
}
