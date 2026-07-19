import {
  materializeClassSession,
  requireTimetableEntryAccess,
  trustedTenantInput,
} from "@classroom-os/database";
import { NextRequest } from "next/server";

import { requiredString, withAuthenticatedApi } from "@/lib/api";

type TimetableRouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, route: TimetableRouteContext) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context }, body = {}) => {
      const { id } = await route.params;
      const localDate = requiredString(body, "localDate");
      await requireTimetableEntryAccess(context, id, localDate);
      return materializeClassSession(
        trustedTenantInput(context, {
          timetableEntryId: id,
          localDate,
        }),
      );
    },
    201,
  );
}
