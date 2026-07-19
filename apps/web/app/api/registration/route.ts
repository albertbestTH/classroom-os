import { requestSchoolRegistration } from "@classroom-os/database";
import { NextRequest } from "next/server";

import { apiError, apiSuccess, optionalNullableString, readJsonObject, requiredString } from "@/lib/api";
import { getClientIp } from "@/lib/login-rate-limit";
import { enforcePublicMutationRateLimit } from "@/lib/public-mutation-rate-limit";

export async function POST(request: NextRequest) {
  try {
    enforcePublicMutationRateLimit(getClientIp(request.headers), "registration-request");
    const body = await readJsonObject(request);
    return apiSuccess(await requestSchoolRegistration({
      schoolName: requiredString(body, "schoolName"),
      schoolCode: requiredString(body, "schoolCode"),
      firstName: requiredString(body, "firstName"),
      lastName: requiredString(body, "lastName"),
      phoneNumber: optionalNullableString(body, "phoneNumber"),
      email: requiredString(body, "email"),
      password: requiredString(body, "password"),
    }));
  } catch (error) {
    return apiError(error);
  }
}
