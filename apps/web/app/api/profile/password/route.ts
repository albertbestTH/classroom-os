import { changeOwnPassword } from "@classroom-os/database";
import { NextRequest } from "next/server";

import { requiredString, withAuthenticatedApi } from "@/lib/api";

export async function POST(request: NextRequest) {
  return withAuthenticatedApi(request, { mutation: true, json: true }, async ({ context }, body = {}) => {
    await changeOwnPassword(context, {
      currentPassword: requiredString(body, "currentPassword"),
      newPassword: requiredString(body, "newPassword"),
    });
    return { ok: true };
  });
}
