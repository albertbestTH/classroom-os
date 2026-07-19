import type { VerificationRequestResult } from "@classroom-os/types";
import { router } from "expo-router";
import { useState, type ComponentProps } from "react";
import { StyleSheet, Text, TextInput } from "react-native";

import { AppButton, AppHeader, Card, SafeScreen } from "@/components/ui/primitives";
import { colors, radius, spacing } from "@/constants/tokens";
import { apiRequest } from "@/lib/api-client";
import { thaiErrorMessage } from "@/lib/api-error";

export default function RegisterScreen() {
  const [values, setValues] = useState({ schoolName: "", schoolCode: "", firstName: "", lastName: "", phoneNumber: "", email: "", password: "" });
  const [verificationToken, setVerificationToken] = useState(""); const [message, setMessage] = useState(""); const [pending, setPending] = useState(false); const [requested, setRequested] = useState(false);
  const set = (key: keyof typeof values) => (value: string) => setValues((current) => ({ ...current, [key]: value }));
  async function requestRegistration() {
    setPending(true); setMessage("");
    try { const result = await apiRequest<VerificationRequestResult>("/api/registration", { method: "POST", body: { ...values, phoneNumber: values.phoneNumber || null } }); setVerificationToken(result.developmentToken ?? ""); setRequested(true); setMessage("สร้างคำขอแล้ว กรุณายืนยันอีเมล"); }
    catch (error) { setMessage(thaiErrorMessage(error)); } finally { setPending(false); }
  }
  async function confirm() {
    setPending(true); setMessage("");
    try { await apiRequest("/api/registration/confirm", { method: "POST", body: { token: verificationToken } }); setMessage("สมัครสำเร็จแล้ว กรุณาเข้าสู่ระบบบนเว็บเพื่อจัดการโรงเรียน"); setRequested(false); }
    catch (error) { setMessage(thaiErrorMessage(error)); } finally { setPending(false); }
  }
  return <SafeScreen><AppHeader title="สมัครโรงเรียนใหม่" subtitle="บัญชีแรกจะเป็นเจ้าของโรงเรียน และใช้เว็บสำหรับงานบริหาร" />
    {!requested ? <Card>
      <Field label="ชื่อโรงเรียน" value={values.schoolName} onChangeText={set("schoolName")} />
      <Field label="รหัสโรงเรียน" value={values.schoolCode} onChangeText={set("schoolCode")} autoCapitalize="characters" />
      <Field label="ชื่อผู้ดูแล" value={values.firstName} onChangeText={set("firstName")} />
      <Field label="นามสกุล" value={values.lastName} onChangeText={set("lastName")} />
      <Field label="เบอร์โทรศัพท์" value={values.phoneNumber} onChangeText={set("phoneNumber")} keyboardType="phone-pad" />
      <Field label="อีเมล" value={values.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" />
      <Field label="รหัสผ่านอย่างน้อย 12 ตัว" value={values.password} onChangeText={set("password")} secureTextEntry />
      <AppButton label={pending ? "กำลังส่ง…" : "สร้างโรงเรียนใหม่"} disabled={pending} onPress={() => void requestRegistration()} />
    </Card> : <Card><Field label="รหัสยืนยันอีเมล" value={verificationToken} onChangeText={setVerificationToken} autoCapitalize="none" /><AppButton label={pending ? "กำลังยืนยัน…" : "ยืนยันการสมัคร"} disabled={pending || !verificationToken} onPress={() => void confirm()} /></Card>}
    {message ? <Text accessibilityRole="alert" style={styles.message}>{message}</Text> : null}
    <AppButton label="กลับไปเข้าสู่ระบบ" tone="secondary" onPress={() => router.replace("/(auth)/login")} />
  </SafeScreen>;
}

type FieldProps = ComponentProps<typeof TextInput> & { label: string };
function Field({ label, ...props }: FieldProps) { return <><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} style={styles.input} {...props} /></>; }
const styles = StyleSheet.create({ label: { color: colors.text, fontWeight: "700" }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: 16, color: colors.text }, message: { color: colors.primaryDark, lineHeight: 22, fontWeight: "700" } });
