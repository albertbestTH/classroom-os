import {
  AuthError,
  DomainError,
  authError,
  domainError,
  resolveServerSession,
  type ResolvedSessionResult,
} from "@classroom-os/database";
import type { ApiErrorCode, ApiErrorResponse, ApiSuccessResponse } from "@classroom-os/types";
import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";

const DEFAULT_MAX_JSON_BYTES = 64 * 1_024;
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
} as const;

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  ACCOUNT_DISABLED: 403,
  RATE_LIMITED: 429,
  FORBIDDEN: 403,
  TENANT_ACCESS_DENIED: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INVALID_STATE_TRANSITION: 409,
  VALIDATION_ERROR: 400,
  INTERNAL_ERROR: 500,
};

export function apiSuccess<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ data }, { status, headers: NO_STORE_HEADERS });
}

function fieldErrorsFrom(error: DomainError): Record<string, string[]> | undefined {
  const issues = error.details?.issues;
  if (!Array.isArray(issues)) return undefined;
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    if (!issue || typeof issue !== "object") continue;
    const pathValue = "path" in issue ? issue.path : undefined;
    const messageValue = "message" in issue ? issue.message : undefined;
    const key = Array.isArray(pathValue) ? pathValue.join(".") : "request";
    const message = typeof messageValue === "string" ? messageValue : "Invalid value.";
    (fieldErrors[key || "request"] ??= []).push(message);
  }
  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
}

export function apiError(error: unknown): NextResponse<ApiErrorResponse> {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: STATUS_BY_CODE[error.code], headers: NO_STORE_HEADERS },
    );
  }
  if (error instanceof DomainError) {
    const fieldErrors = fieldErrorsFrom(error);
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(fieldErrors ? { fieldErrors } : {}),
        },
      },
      { status: STATUS_BY_CODE[error.code], headers: NO_STORE_HEADERS },
    );
  }
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "An internal error occurred." } },
    { status: 500, headers: NO_STORE_HEADERS },
  );
}

export async function readJsonObject(
  request: NextRequest,
  maxBytes = DEFAULT_MAX_JSON_BYTES,
): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    throw domainError("VALIDATION_ERROR", "Content-Type must be application/json.");
  }
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw domainError("VALIDATION_ERROR", "The request body is too large.");
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw domainError("VALIDATION_ERROR", "The request body is too large.");
  }
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("not an object");
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw domainError("VALIDATION_ERROR", "The JSON request body is malformed.");
  }
}

export function assertSameOrigin(request: NextRequest): void {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const host = request.headers.get("host");
  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  const requestProtocol = forwardedProtocol ?? new URL(request.url).protocol.replace(":", "");
  const hostOrigin = host ? `${requestProtocol}://${host}` : null;
  if (origin === request.nextUrl.origin || origin === hostOrigin) return;
  if (!origin && fetchSite === "same-origin") return;
  throw authError("FORBIDDEN", "The request origin is not allowed.");
}

export async function requireApiSession(request: NextRequest): Promise<ResolvedSessionResult> {
  return resolveServerSession(bearerTokenFromRequest(request) ?? request.cookies.get(AUTH_COOKIE_NAME)?.value);
}

export function bearerTokenFromRequest(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization);
  if (!match?.[1]) throw authError("UNAUTHENTICATED", "Authentication is required.");
  return match[1];
}

export async function requireMobileApiSession(request: NextRequest): Promise<ResolvedSessionResult> {
  const token = bearerTokenFromRequest(request);
  if (!token) throw authError("UNAUTHENTICATED", "Mobile bearer authentication is required.");
  return resolveServerSession(token);
}

type AuthenticatedHandler<T> = (
  session: ResolvedSessionResult,
  body: Record<string, unknown> | undefined,
) => Promise<T>;

export async function withAuthenticatedApi<T>(
  request: NextRequest,
  options: { mutation?: boolean; json?: boolean; maxBytes?: number },
  handler: AuthenticatedHandler<T>,
  successStatus = 200,
): Promise<NextResponse<ApiSuccessResponse<T> | ApiErrorResponse>> {
  const requestId = request.headers.get("x-request-id")?.slice(0, 128) || crypto.randomUUID();
  try {
    if (options.mutation && !request.headers.has("authorization")) assertSameOrigin(request);
    const session = await requireApiSession(request);
    const body = options.json ? await readJsonObject(request, options.maxBytes) : undefined;
    const response = apiSuccess(await handler(session, body), successStatus);
    response.headers.set("x-request-id", requestId);
    return response;
  } catch (error) {
    const response = apiError(error);
    response.headers.set("x-request-id", requestId);
    if (response.status >= 500) {
      console.error(JSON.stringify({ level: "error", event: "api.internal_error", requestId, path: request.nextUrl.pathname }));
    }
    return response;
  }
}

export async function withPublicJsonApi<T>(
  request: NextRequest,
  handler: (body: Record<string, unknown>) => Promise<T>,
): Promise<NextResponse<ApiSuccessResponse<T> | ApiErrorResponse>> {
  const requestId = request.headers.get("x-request-id")?.slice(0, 128) || crypto.randomUUID();
  try {
    assertSameOrigin(request);
    const body = await readJsonObject(request);
    const response = apiSuccess(await handler(body));
    response.headers.set("x-request-id", requestId);
    return response;
  } catch (error) {
    const response = apiError(error);
    response.headers.set("x-request-id", requestId);
    if (response.status >= 500) {
      console.error(JSON.stringify({ level: "error", event: "api.internal_error", requestId, path: request.nextUrl.pathname }));
    }
    return response;
  }
}

export function requiredString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== "string") {
    throw domainError("VALIDATION_ERROR", `${key} must be a string.`, {
      issues: [{ path: [key], message: `${key} must be a string.` }],
    });
  }
  return value;
}

export function optionalString(
  body: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw domainError("VALIDATION_ERROR", `${key} must be a string.`);
  }
  return value;
}

export function optionalNullableString(
  body: Record<string, unknown>,
  key: string,
): string | null | undefined {
  const value = body[key];
  if (value === undefined || value === null) return value;
  if (typeof value !== "string") {
    throw domainError("VALIDATION_ERROR", `${key} must be a string or null.`);
  }
  return value;
}

export function optionalBoolean(
  body: Record<string, unknown>,
  key: string,
): boolean | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw domainError("VALIDATION_ERROR", `${key} must be a boolean.`);
  }
  return value;
}

export function requiredNumber(body: Record<string, unknown>, key: string): number {
  const value = body[key];
  if (typeof value !== "number") {
    throw domainError("VALIDATION_ERROR", `${key} must be a number.`);
  }
  return value;
}

export function optionalNumber(
  body: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (typeof value !== "number") {
    throw domainError("VALIDATION_ERROR", `${key} must be a number.`);
  }
  return value;
}

export function requiredArray(body: Record<string, unknown>, key: string): unknown[] {
  const value = body[key];
  if (!Array.isArray(value)) {
    throw domainError("VALIDATION_ERROR", `${key} must be an array.`);
  }
  return value;
}

export function requiredOneOf<const T extends readonly string[]>(
  body: Record<string, unknown>,
  key: string,
  values: T,
): T[number] {
  const value = requiredString(body, key);
  if (!values.includes(value)) {
    throw domainError("VALIDATION_ERROR", `${key} has an unsupported value.`);
  }
  return value as T[number];
}
