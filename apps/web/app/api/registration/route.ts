import { requestSchoolRegistration } from "@classroom-os/database";
import { NextRequest } from "next/server";

import { apiError, apiSuccess, optionalNullableString, optionalString, readJsonObject, requiredOneOf, requiredString } from "@/lib/api";
import { getClientIp } from "@/lib/login-rate-limit";
import { enforcePublicMutationRateLimit } from "@/lib/public-mutation-rate-limit";

export async function POST(request: NextRequest) {
  try {
    enforcePublicMutationRateLimit(getClientIp(request.headers), "registration-request");
    const body = await readJsonObject(request);
    const workspaceType = body.workspaceType === undefined ? "SCHOOL" : requiredOneOf(body, "workspaceType", ["SCHOOL", "PERSONAL"] as const);
    return apiSuccess(await requestSchoolRegistration({
      workspaceType,
      schoolName: optionalString(body, "schoolName"),
      schoolCode: optionalString(body, "schoolCode"),
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
