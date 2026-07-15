import {
  createStaffAccount,
  listStaffUsers,
} from "@classroom-os/database";
import { USER_ROLES } from "@classroom-os/types";
import { NextRequest } from "next/server";

import { requiredOneOf, requiredString, withAuthenticatedApi } from "@/lib/api";

export async function GET(request: NextRequest) {
  return withAuthenticatedApi(request, {}, async ({ context }) =>
    listStaffUsers({ auth: context }),
  );
}

export async function POST(request: NextRequest) {
  return withAuthenticatedApi(
    request,
    { mutation: true, json: true },
    async ({ context }, body = {}) =>
      createStaffAccount({
        auth: context,
        account: {
          email: requiredString(body, "email"),
          firstName: requiredString(body, "firstName"),
          lastName: requiredString(body, "lastName"),
          role: requiredOneOf(body, "role", USER_ROLES),
          temporaryPassword: requiredString(body, "temporaryPassword"),
        },
      }),
    201,
  );
}
