import {
  getTimetableEntry,
  requireTimetableEntryAccess,
  trustedTenantInput,
  updateTimetableEntry,
} from "@classroom-os/database";
import { NextRequest } from "next/server";

import {
  optionalBoolean,
  optionalNullableString,
  optionalNumber,
  optionalString,
  withAuthenticatedApi,
} from "@/lib/api";

type TimetableRouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, route: TimetableRouteContext) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context }, body = {}) => {
      const { id } = await route.params;
      await requireTimetableEntryAccess(context, id);
      await getTimetableEntry({ schoolId: context.schoolId, timetableEntryId: id });
      return updateTimetableEntry(
        trustedTenantInput(context, {
          timetableEntryId: id,
          weekday: optionalNumber(body, "weekday"),
          startTime: optionalString(body, "startTime"),
          endTime: optionalString(body, "endTime"),
          room: optionalNullableString(body, "room"),
          isActive: optionalBoolean(body, "isActive"),
        }),
      );
    },
  );
}
