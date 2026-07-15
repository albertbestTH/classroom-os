import { setStaffAccountStatus } from "@classroom-os/database";
import { ACCOUNT_STATUSES } from "@classroom-os/types";
import { NextRequest } from "next/server";

import { requiredOneOf, withAuthenticatedApi } from "@/lib/api";

type StaffRouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, route: StaffRouteContext) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context }, body = {}) => {
      const { id } = await route.params;
      return setStaffAccountStatus({
        auth: context,
        change: { userId: id, status: requiredOneOf(body, "status", ACCOUNT_STATUSES) },
      });
    },
  );
}
