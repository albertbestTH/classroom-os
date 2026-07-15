import {
  createClassSession,
  requireTimetableEntryAccess,
  trustedTenantInput,
} from "@classroom-os/database";
import { NextRequest } from "next/server";

import {
  optionalNullableString,
  requiredString,
  withAuthenticatedApi,
} from "@/lib/api";

export async function POST(request: NextRequest) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context }, body = {}) => {
      const timetableEntryId = requiredString(body, "timetableEntryId");
      await requireTimetableEntryAccess(context, timetableEntryId);
      return createClassSession(
        trustedTenantInput(context, {
          timetableEntryId,
          scheduledStart: requiredString(body, "scheduledStart"),
          scheduledEnd: requiredString(body, "scheduledEnd"),
          notes: optionalNullableString(body, "notes"),
        }),
      );
    },
    201,
  );
}
