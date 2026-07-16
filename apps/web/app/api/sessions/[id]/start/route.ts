import {
  requireClassSessionAccess,
  startClassSession,
  trustedTenantInput,
} from "@classroom-os/database";
import { NextRequest } from "next/server";

import { optionalString, withAuthenticatedApi } from "@/lib/api";

type SessionRouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, route: SessionRouteContext) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context }, body = {}) => {
      const { id } = await route.params;
      await requireClassSessionAccess(context, id);
      return startClassSession(
        trustedTenantInput(context, {
          sessionId: id,
          startedAt: optionalString(body, "startedAt"),
          expectedUpdatedAt: optionalString(body, "expectedUpdatedAt"),
        }),
      );
    },
  );
}
