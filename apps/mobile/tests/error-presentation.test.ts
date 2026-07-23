import { errorPresentation, MobileApiError } from "@/lib/api-error";

describe("mobile error presentation", () => {
  it.each([
    [401, "เซสชันหมดอายุ", false], [403, "ไม่มีสิทธิ์เข้าถึง", false], [404, "ไม่พบข้อมูล", false],
    [409, "ข้อมูลมีการเปลี่ยนแปลง", true], [422, "ข้อมูลไม่ถูกต้อง", false], [500, "ระบบขัดข้องชั่วคราว", true],
  ] as const)("maps HTTP %s to a stable UI state", (status, title, retryable) => {
    expect(errorPresentation(new MobileApiError("safe", "api", undefined, status))).toEqual(expect.objectContaining({ title, retryable }));
  });

  it("distinguishes offline, timeout, and unknown errors", () => {
    expect(errorPresentation(new MobileApiError("offline", "network")).title).toBe("ไม่มีการเชื่อมต่อ");
    expect(errorPresentation(new MobileApiError("slow", "timeout")).title).toBe("เซิร์ฟเวอร์ตอบช้า");
    expect(errorPresentation(new Error("unknown")).title).toBe("เกิดข้อผิดพลาด");
  });
});
