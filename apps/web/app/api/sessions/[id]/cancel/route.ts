import {
  cancelClassSession,
  requireClassSessionAccess,
  trustedTenantInput,
} from "@classroom-os/database";
import { NextRequest } from "next/server";

import { optionalString, requiredString, withAuthenticatedApi } from "@/lib/api";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, route: RouteContext) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context }, body = {}) => {
      const { id } = await route.params;
      await requireClassSessionAccess(context, id);
      return cancelClassSession({
        ...trustedTenantInput(context, {
          sessionId: id,
          reason: requiredString(body, "reason"),
          expectedUpdatedAt: optionalString(body, "expectedUpdatedAt"),
        }),
        auth: context,
      });
    },
  );
}
