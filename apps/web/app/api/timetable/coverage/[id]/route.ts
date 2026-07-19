import { resolveTimetableCoverage } from "@classroom-os/database";
import type { TimetableCoverageStatus } from "@classroom-os/types";
import { NextRequest } from "next/server";

import { requiredString, withAuthenticatedApi } from "@/lib/api";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, route: RouteContext) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context }, body = {}) => {
      const { id } = await route.params;
      return resolveTimetableCoverage({
        schoolId: context.schoolId,
        actorUserId: context.userId,
        actorRole: context.role,
        actorTeacherId: context.teacherId,
        coverageId: id,
        status: requiredString(body, "status") as Extract<TimetableCoverageStatus, "active" | "declined" | "cancelled">,
      });
    },
  );
}
