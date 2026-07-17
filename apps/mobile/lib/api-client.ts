import type { ApiErrorResponse, ApiSuccessResponse } from "@classroom-os/types";

import { MobileApiError } from "./api-error";
import { getApiBaseUrl } from "./environment";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  token?: string | null;
  body?: unknown;
  timeoutMs?: number;
  retryReads?: number;
};

function isApiError(value: unknown): value is ApiErrorResponse {
  if (!value || typeof value !== "object" || !("error" in value)) return false;
  const error = (value as { error?: unknown }).error;
  return Boolean(error && typeof error === "object" && "code" in error && "message" in error);
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const retries = method === "GET" ? (options.retryReads ?? 1) : 0;
  const baseUrl = getApiBaseUrl();
  for (let attempt = 0; ; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 12_000);
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          Accept: "application/json",
          ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });
      const text = await response.text();
      let parsed: unknown;
      try { parsed = text ? JSON.parse(text) : null; }
      catch { throw new MobileApiError("เซิร์ฟเวอร์ตอบกลับในรูปแบบที่ไม่รองรับ", "unknown", undefined, response.status); }
      if (!response.ok || isApiError(parsed)) {
        const payload = isApiError(parsed) ? parsed.error : undefined;
        throw new MobileApiError(payload?.message ?? "คำขอไม่สำเร็จ", "api", payload?.code, response.status, payload?.fieldErrors);
      }
      if (!parsed || typeof parsed !== "object" || !("data" in parsed)) {
        throw new MobileApiError("ไม่พบข้อมูลตอบกลับจากเซิร์ฟเวอร์", "unknown", undefined, response.status);
      }
      return (parsed as ApiSuccessResponse<T>).data;
    } catch (error) {
      if (error instanceof MobileApiError) throw error;
      const timedOut = error instanceof Error && error.name === "AbortError";
      if (attempt < retries) continue;
      throw new MobileApiError(timedOut ? "Request timed out." : "Network request failed.", timedOut ? "timeout" : "network");
    } finally { clearTimeout(timeout); }
  }
}
