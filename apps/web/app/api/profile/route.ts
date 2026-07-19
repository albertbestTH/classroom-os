import { getOwnProfile, updateOwnProfile } from "@classroom-os/database";
import { NextRequest } from "next/server";

import { optionalNullableString, requiredString, withAuthenticatedApi } from "@/lib/api";

export async function GET(request: NextRequest) {
  return withAuthenticatedApi(request, {}, ({ context }) => getOwnProfile(context));
}

export async function PATCH(request: NextRequest) {
  return withAuthenticatedApi(request, { mutation: true, json: true }, ({ context }, body = {}) =>
    updateOwnProfile(context, {
      firstName: requiredString(body, "firstName"),
      lastName: requiredString(body, "lastName"),
      phoneNumber: optionalNullableString(body, "phoneNumber"),
    }),
  );
}
