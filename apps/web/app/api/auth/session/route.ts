import { revokeServerSession } from "@classroom-os/database";
import { NextRequest } from "next/server";

import { AUTH_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth-cookie";
import {
  apiError,
  apiSuccess,
  assertSameOrigin,
  readJsonObject,
  requiredString,
  withAuthenticatedApi,
} from "@/lib/api";
import { getClientIp, loginWithRateLimit } from "@/lib/login-rate-limit";

export async function GET(request: NextRequest) {
  return withAuthenticatedApi(request, {}, async ({ user }) => user);
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const body = await readJsonObject(request);
    const session = await loginWithRateLimit(
      {
        email: requiredString(body, "email"),
        password: requiredString(body, "password"),
      },
      getClientIp(request.headers),
    );
    const response = apiSuccess(session.user);
    response.cookies.set(
      AUTH_COOKIE_NAME,
      session.token,
      sessionCookieOptions(session.expiresAt),
    );
    return response;
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  const response = await withAuthenticatedApi(
    request,
    { mutation: true },
    async () => {
      await revokeServerSession(request.cookies.get(AUTH_COOKIE_NAME)?.value);
      return { loggedOut: true };
    },
  );
  if (response.status < 400) {
    response.cookies.set(AUTH_COOKIE_NAME, "", {
      ...sessionCookieOptions(new Date(0)),
      maxAge: 0,
    });
  }
  return response;
}
