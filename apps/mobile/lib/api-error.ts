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
  if (error.code === "FORBIDDEN") return "บัญชีนี้ไม่มีสิทธิ์เข้าถึงรายการดังกล่าว";
  if (error.kind === "network") return "ไม่สามารถเชื่อมต่อเครือข่ายได้ กรุณาตรวจสอบอินเทอร์เน็ต";
  if (error.kind === "timeout") return "การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่";
  return error.message || "เกิดข้อผิดพลาด กรุณาลองใหม่";
}

export type ErrorPresentation = { title: string; message: string; retryable: boolean };

export function errorPresentation(error: unknown): ErrorPresentation {
  if (!(error instanceof MobileApiError)) return { title: "เกิดข้อผิดพลาด", message: thaiErrorMessage(error), retryable: true };
  if (error.kind === "network") return { title: "ไม่มีการเชื่อมต่อ", message: "ตรวจสอบอินเทอร์เน็ต แล้วลองอีกครั้ง", retryable: true };
  if (error.kind === "timeout") return { title: "เซิร์ฟเวอร์ตอบช้า", message: "การเชื่อมต่อหมดเวลา กรุณาลองอีกครั้ง", retryable: true };
  if (error.status === 401) return { title: "เซสชันหมดอายุ", message: "กรุณาเข้าสู่ระบบอีกครั้ง", retryable: false };
  if (error.status === 403) return { title: "ไม่มีสิทธิ์เข้าถึง", message: "บัญชีนี้ไม่มีสิทธิ์ทำรายการดังกล่าว", retryable: false };
  if (error.status === 404) return { title: "ไม่พบข้อมูล", message: "รายการนี้อาจถูกย้ายหรือลบแล้ว", retryable: false };
  if (error.status === 409) return { title: "ข้อมูลมีการเปลี่ยนแปลง", message: "โหลดข้อมูลล่าสุดก่อนทำรายการอีกครั้ง", retryable: true };
  if (error.status === 422 || error.status === 400) return { title: "ข้อมูลไม่ถูกต้อง", message: thaiErrorMessage(error), retryable: false };
  if (error.status && error.status >= 500) return { title: "ระบบขัดข้องชั่วคราว", message: "กรุณารอสักครู่แล้วลองใหม่", retryable: true };
  return { title: "เกิดข้อผิดพลาด", message: thaiErrorMessage(error), retryable: true };
}
