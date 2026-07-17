export function getApiBaseUrl(): string {
  const value = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "");
  if (!value) {
    throw new Error("ยังไม่ได้ตั้งค่า EXPO_PUBLIC_API_BASE_URL สำหรับแอป Classroom OS");
  }
  if (!/^https?:\/\//.test(value)) throw new Error("EXPO_PUBLIC_API_BASE_URL ต้องเป็น URL แบบ http หรือ https");
  return value;
}

export function developmentEnvironmentLabel(): string | null {
  if (!__DEV__) return null;
  try { return new URL(getApiBaseUrl()).host; } catch { return "ยังไม่ตั้งค่า API"; }
}
