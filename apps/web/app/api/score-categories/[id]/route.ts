import {
  deleteScoreCategory,
  requireScoreCategoryAccess,
  trustedTenantInput,
  updateScoreCategory,
} from "@classroom-os/database";
import { NextRequest } from "next/server";

import { requiredString, withAuthenticatedApi } from "@/lib/api";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, route: RouteContext) {
  return withAuthenticatedApi(request, { mutation: true, json: true }, async ({ context }, body = {}) => {
    const { id } = await route.params;
    await requireScoreCategoryAccess(context, id);
    return updateScoreCategory(trustedTenantInput(context, {
      categoryId: id,
      name: requiredString(body, "name"),
    }));
  });
}

export async function DELETE(request: NextRequest, route: RouteContext) {
  return withAuthenticatedApi(request, { mutation: true }, async ({ context }) => {
    const { id } = await route.params;
    await requireScoreCategoryAccess(context, id);
    return deleteScoreCategory(trustedTenantInput(context, { categoryId: id }));
  });
}
