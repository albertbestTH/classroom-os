import {
  requireScoreAccess,
  trustedTenantInput,
  updateScoreBatch,
} from "@classroom-os/database";
import type { UpdateScoreBatchInput } from "@classroom-os/types";
import { NextRequest } from "next/server";

import { requiredArray, requiredString, withAuthenticatedApi } from "@/lib/api";

type ScoresRouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, route: ScoresRouteContext) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context }, body = {}) => {
      const { id } = await route.params;
      const classroomId = requiredString(body, "classroomId");
      await requireScoreAccess(context, { assessmentId: id, classroomId });
      return updateScoreBatch(
        trustedTenantInput(context, {
          assessmentId: id,
          gradedById: context.role === "TEACHER" ? context.teacherId : null,
          scores: requiredArray(body, "scores") as UpdateScoreBatchInput["scores"],
        }),
      );
    },
  );
}
