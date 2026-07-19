import { requestOwnEmailChange } from "@classroom-os/database";
import { NextRequest } from "next/server";

import { requiredString, withAuthenticatedApi } from "@/lib/api";

export async function POST(request: NextRequest) {
  return withAuthenticatedApi(request, { mutation: true, json: true }, ({ context }, body = {}) =>
    requestOwnEmailChange(context, {
      newEmail: requiredString(body, "newEmail"),
      currentPassword: requiredString(body, "currentPassword"),
    }),
  );
}
