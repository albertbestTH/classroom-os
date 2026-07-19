import { getSchoolProfile, updateSchoolProfile } from "@classroom-os/database";
import { NextRequest } from "next/server";

import { optionalNullableString, requiredString, withAuthenticatedApi } from "@/lib/api";

export async function GET(request: NextRequest) {
  return withAuthenticatedApi(request, {}, ({ context }) => getSchoolProfile(context));
}

export async function PATCH(request: NextRequest) {
  return withAuthenticatedApi(request, { mutation: true, json: true }, ({ context }, body = {}) =>
    updateSchoolProfile(context, {
      name: requiredString(body, "name"),
      email: optionalNullableString(body, "email"),
      phoneNumber: optionalNullableString(body, "phoneNumber"),
      address: optionalNullableString(body, "address"),
    }),
  );
}
