import type { ApiErrorCode } from "@classroom-os/types";

export type MobileErrorKind = "api" | "network" | "timeout" | "configuration" | "unknown";

export class MobileApiError extends Error {
  constructor(
    message: string,
    readonly kind: MobileErrorKind,
    readonly code?: ApiErrorCode,
    readonly status?: number,
    readonly fieldErrors?: Readonly<Record<string, readonly string[]>>,
  ) { super(message); this.name = "MobileApiError"; }
}

export function thaiErrorMessage(error: unknown): string {
  if (!(error instanceof MobileApiError)) return "เกิดข้อผิดพลาด กรุณาลองใหม่";
  if (error.code === "UNAUTHENTICATED") return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง";
  if (error.code === "INVALID_CREDENTIALS") return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  if (error.code === "ACCOUNT_DISABLED") return "บัญชีนี้ไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลโรงเรียน";
  if (error.code === "FORBIDDEN") return "แอปนี้สำหรับครูผู้สอน การจัดการโรงเรียนใช้งานผ่านเว็บ";
  if (error.kind === "network") return "ไม่สามารถเชื่อมต่อเครือข่ายได้ กรุณาตรวจสอบอินเทอร์เน็ต";
  if (error.kind === "timeout") return "การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่";
  return error.message || "เกิดข้อผิดพลาด กรุณาลองใหม่";
}
