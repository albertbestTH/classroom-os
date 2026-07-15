import { assignTeacherProfile } from "@classroom-os/database";
import { NextRequest } from "next/server";

import { requiredString, withAuthenticatedApi } from "@/lib/api";

type StaffRouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, route: StaffRouteContext) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context }, body = {}) => {
      const { id } = await route.params;
      return assignTeacherProfile({
        auth: context,
        profile: { userId: id, employeeCode: requiredString(body, "employeeCode") },
      });
    },
  );
}
