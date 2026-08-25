import {
  deleteAssessment,
  requireAssessmentAccess,
  trustedTenantInput,
  updateAssessment,
} from "@classroom-os/database";
import { NextRequest } from "next/server";

import { optionalNumber, optionalString, withAuthenticatedApi } from "@/lib/api";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, route: RouteContext) {
  return withAuthenticatedApi(request, { mutation: true, json: true }, async ({ context }, body = {}) => {
    const { id } = await route.params;
    await requireAssessmentAccess(context, id);
    return updateAssessment(trustedTenantInput(context, {
      assessmentId: id,
      title: optionalString(body, "title"),
      categoryId: optionalString(body, "categoryId"),
      maxScore: optionalNumber(body, "maxScore"),
      assessmentDate: optionalString(body, "assessmentDate"),
    }));
  });
}

export async function DELETE(request: NextRequest, route: RouteContext) {
  return withAuthenticatedApi(request, { mutation: true }, async ({ context }) => {
    const { id } = await route.params;
    await requireAssessmentAccess(context, id);
    return deleteAssessment(trustedTenantInput(context, { assessmentId: id }));
  });
}
