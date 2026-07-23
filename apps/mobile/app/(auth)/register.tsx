import type { VerificationRequestResult } from "@classroom-os/types";
import { router } from "expo-router";
import { useState, type ComponentProps } from "react";
import { StyleSheet, Text } from "react-native";

import { AppButton, AppHeader, Card, FormField, SafeScreen } from "@/components/ui/primitives";
import { radius, spacing } from "@/constants/tokens";
import { apiRequest } from "@/lib/api-client";
import { thaiErrorMessage } from "@/lib/api-error";
import { useTheme } from "@/features/theme/theme-context";

export default function RegisterScreen() {
  const { colors: themeColors } = useTheme();
  const [workspaceType, setWorkspaceType] = useState<"PERSONAL" | "SCHOOL">("PERSONAL");
  const [values, setValues] = useState({ schoolName: "", schoolCode: "", firstName: "", lastName: "", phoneNumber: "", email: "", password: "" });
  const [verificationToken, setVerificationToken] = useState(""); const [message, setMessage] = useState(""); const [pending, setPending] = useState(false); const [requested, setRequested] = useState(false);
  const set = (key: keyof typeof values) => (value: string) => setValues((current) => ({ ...current, [key]: value }));
  async function requestRegistration() {
    setPending(true); setMessage("");
    try { const result = await apiRequest<VerificationRequestResult>("/api/registration", { method: "POST", body: { ...values, workspaceType, phoneNumber: values.phoneNumber || null, schoolName: workspaceType === "SCHOOL" ? values.schoolName : undefined, schoolCode: workspaceType === "SCHOOL" ? values.schoolCode : undefined } }); setVerificationToken(result.developmentToken ?? ""); setRequested(true); setMessage("สร้างคำขอแล้ว กรุณายืนยันอีเมล"); }
    catch (error) { setMessage(thaiErrorMessage(error)); } finally { setPending(false); }
  }
  async function confirm() {
    setPending(true); setMessage("");
    try { await apiRequest("/api/registration/confirm", { method: "POST", body: { token: verificationToken } }); setMessage(workspaceType === "PERSONAL" ? "สมัครสำเร็จแล้ว คุณสามารถเข้าสู่แอปและเริ่มตั้งค่าการสอนได้" : "สมัครสำเร็จแล้ว กรุณาเข้าสู่ระบบบนเว็บเพื่อจัดการโรงเรียน"); setRequested(false); }
    catch (error) { setMessage(thaiErrorMessage(error)); } finally { setPending(false); }
  }
  return <SafeScreen><AppHeader title="สมัครใช้งาน" subtitle="ใช้ส่วนตัวสำหรับคาบของคุณ หรือสร้างพื้นที่สำหรับทั้งโรงเรียน" />
    {!requested ? <Card>
      <Text style={[styles.label, { color: themeColors.text }]}>รูปแบบการใช้งาน</Text>
      <AppButton label="ครูใช้ส่วนตัว" tone={workspaceType === "PERSONAL" ? "primary" : "secondary"} onPress={() => setWorkspaceType("PERSONAL")} />
      <AppButton label="โรงเรียนใช้งาน" tone={workspaceType === "SCHOOL" ? "primary" : "secondary"} onPress={() => setWorkspaceType("SCHOOL")} />
      {workspaceType === "SCHOOL" ? <><Field label="ชื่อโรงเรียน" value={values.schoolName} onChangeText={set("schoolName")} /><Field label="รหัสโรงเรียน" value={values.schoolCode} onChangeText={set("schoolCode")} autoCapitalize="characters" /></> : <Text style={[styles.hint, { color: themeColors.muted, backgroundColor: themeColors.primarySoft }]}>ระบบจะแยกห้อง นักเรียน ตารางสอน และคะแนนของคุณออกจากผู้ใช้อื่น</Text>}
      <Field label="ชื่อผู้ดูแล" value={values.firstName} onChangeText={set("firstName")} />
      <Field label="นามสกุล" value={values.lastName} onChangeText={set("lastName")} />
      <Field label="เบอร์โทรศัพท์" value={values.phoneNumber} onChangeText={set("phoneNumber")} keyboardType="phone-pad" />
      <Field label="อีเมล" value={values.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" />
      <Field label="รหัสผ่านอย่างน้อย 12 ตัว" value={values.password} onChangeText={set("password")} secureTextEntry />
      <AppButton label={pending ? "กำลังส่ง…" : workspaceType === "PERSONAL" ? "สร้างพื้นที่สอนส่วนตัว" : "สร้างโรงเรียนใหม่"} disabled={pending} onPress={() => void requestRegistration()} />
    </Card> : <Card><Field label="รหัสยืนยันอีเมล" value={verificationToken} onChangeText={setVerificationToken} autoCapitalize="none" /><AppButton label={pending ? "กำลังยืนยัน…" : "ยืนยันการสมัคร"} disabled={pending || !verificationToken} onPress={() => void confirm()} /></Card>}
    {message ? <Text accessibilityRole="alert" style={[styles.message, { color: themeColors.primaryDark }]}>{message}</Text> : null}
    <AppButton label="กลับไปเข้าสู่ระบบ" tone="secondary" onPress={() => router.replace("/(auth)/login")} />
  </SafeScreen>;
}

type FieldProps = ComponentProps<typeof FormField>;
function Field(props: FieldProps) { return <FormField {...props} />; }
const styles = StyleSheet.create({ label: { fontWeight: "700" }, hint: { lineHeight: 22, borderRadius: radius.md, padding: spacing.md }, message: { lineHeight: 22, fontWeight: "700" } });
