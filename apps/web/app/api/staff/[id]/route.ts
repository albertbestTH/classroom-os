import { getStaffUser } from "@classroom-os/database";
import { NextRequest } from "next/server";

import { withAuthenticatedApi } from "@/lib/api";

type StaffRouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, route: StaffRouteContext) {
  return withAuthenticatedApi(request, {}, async ({ context }) => {
    const { id } = await route.params;
    return getStaffUser({ auth: context, userId: id });
  });
}
