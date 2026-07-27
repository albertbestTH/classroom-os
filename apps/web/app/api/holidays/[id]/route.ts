import {
  requireRole,
  trustedTenantInput,
  updateSchoolHoliday,
} from "@classroom-os/database";
import { NextRequest } from "next/server";

import {
  optionalBoolean,
  optionalNullableString,
  optionalString,
  withAuthenticatedApi,
} from "@/lib/api";

type HolidayRouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, route: HolidayRouteContext) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context }, body = {}) => {
      requireRole(context, ["SCHOOL_OWNER", "ADMIN"]);
      const { id } = await route.params;
      return updateSchoolHoliday(
        trustedTenantInput(context, {
          holidayId: id,
          localDate: optionalString(body, "localDate"),
          name: optionalString(body, "name"),
          description: optionalNullableString(body, "description"),
          isActive: optionalBoolean(body, "isActive"),
        }),
      );
    },
  );
}
