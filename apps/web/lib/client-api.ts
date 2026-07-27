import type { ApiErrorCode, ApiErrorResponse, ApiSuccessResponse } from "@classroom-os/types";

export class ApiClientError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly fieldErrors?: Readonly<Record<string, readonly string[]>>,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function requestApi<T>(
  url: string,
  options: { method?: "POST" | "PATCH" | "PUT" | "DELETE"; body?: object } = {},
): Promise<T> {
  const response = await fetch(url, {
    method: options.method ?? "POST",
    headers: options.body ? { "content-type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });
  const payload = (await response.json()) as ApiSuccessResponse<T> | ApiErrorResponse;
  if (!response.ok || !("data" in payload)) {
    const error = "error" in payload ? payload.error : undefined;
    throw new ApiClientError(
      error?.code ?? "INTERNAL_ERROR",
      error?.message ?? "ไม่สามารถดำเนินการได้",
      error?.fieldErrors,
    );
  }
  return payload.data;
}

export function thaiApiError(error: unknown): string {
  if (!(error instanceof ApiClientError)) return "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง";
  const messages: Partial<Record<ApiErrorCode, string>> = {
    CONFLICT: "ข้อมูลนี้มีอยู่แล้วหรือขัดแย้งกับข้อมูลปัจจุบัน",
    VALIDATION_ERROR: "กรุณาตรวจสอบข้อมูลที่กรอกให้ถูกต้อง",
    TENANT_ACCESS_DENIED: "คุณไม่มีสิทธิ์ดำเนินการกับข้อมูลนี้",
    FORBIDDEN: "คุณไม่มีสิทธิ์ดำเนินการนี้",
    NOT_FOUND: "ไม่พบข้อมูลที่ต้องการ",
    UNAUTHENTICATED: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง",
  };
  return messages[error.code] ?? "ไม่สามารถดำเนินการได้ กรุณาลองอีกครั้ง";
}

export function timetableThaiApiError(error: unknown, operation: "create" | "update"): string {
  if (!(error instanceof ApiClientError)) return "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง";
  if (error.code === "CONFLICT") {
    if (error.message === "An identical timetable entry already exists.") return "มีคาบเรียนนี้ในวันและเวลาเดียวกันอยู่แล้ว";
    if (error.message === "The teacher already has an overlapping timetable entry.") return "ครูมีคาบเรียนอื่นในช่วงเวลานี้แล้ว";
    if (error.message === "The classroom already has an overlapping timetable entry.") return "ห้องเรียนมีคาบอื่นในช่วงเวลานี้แล้ว";
  }
  if (error.code === "VALIDATION_ERROR" && (
    error.message === "endTime must be later than startTime." ||
    error.fieldErrors?.endTime?.includes("endTime must be later than startTime.")
  )) return "เวลาเริ่มต้องมาก่อนเวลาสิ้นสุด";
  if (error.code === "NOT_FOUND") return operation === "update" ? "ไม่พบคาบเรียนที่ต้องการแก้ไข" : "ไม่พบงานสอนที่เลือก";
  if (error.code === "FORBIDDEN" || error.code === "TENANT_ACCESS_DENIED") return operation === "update" ? "คุณไม่มีสิทธิ์แก้ไขคาบเรียนนี้" : "คุณไม่มีสิทธิ์เพิ่มคาบเรียนนี้";
  return thaiApiError(error);
}
