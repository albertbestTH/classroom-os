import { DomainError } from "@classroom-os/database";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { apiError, readJsonObject, withAuthenticatedApi } from "@/lib/api";

describe("API response and request security", () => {
  it.each([
    ["NOT_FOUND", 404],
    ["TENANT_ACCESS_DENIED", 403],
    ["CONFLICT", 409],
    ["INVALID_STATE_TRANSITION", 409],
    ["VALIDATION_ERROR", 400],
  ] as const)("maps %s to HTTP %s", async (code, status) => {
    const response = apiError(new DomainError(code, "Safe message"));
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({
      error: { code, message: "Safe message" },
    });
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("does not leak unknown internal errors", async () => {
    const response = apiError(new Error("database password=top-secret stack trace"));
    expect(response.status).toBe(500);
    const text = JSON.stringify(await response.json());
    expect(text).toContain("INTERNAL_ERROR");
    expect(text).not.toMatch(/database|password|top-secret|stack/i);
  });

  it("rejects unauthenticated protected requests", async () => {
    const request = new NextRequest("http://localhost/api/students");
    const response = await withAuthenticatedApi(request, {}, async () => ({ ok: true }));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "UNAUTHENTICATED" },
    });
  });

  it("rejects malformed, non-JSON, and oversized bodies", async () => {
    const malformed = new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });
    await expect(readJsonObject(malformed)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    const wrongType = new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "{}",
    });
    await expect(readJsonObject(wrongType)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    const oversized = new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(100) }),
    });
    await expect(readJsonObject(oversized, 32)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });
});
