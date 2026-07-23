import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";

import { AppButton, AppHeader, FormField, SafeScreen, ThemedText } from "@/components/ui/primitives";
import { spacing } from "@/constants/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { thaiErrorMessage } from "@/lib/api-error";

export default function LoginScreen() {
  const { login, message } = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false); const [error, setError] = useState<string | null>(message);
  async function submit() { setPending(true); setError(null); try { await login(email, password); } catch (value) { setError(thaiErrorMessage(value)); } finally { setPending(false); } }
  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}><SafeScreen>
    <View style={styles.hero}><ThemedText tone="primary" style={styles.brand}>Classroom OS</ThemedText><AppHeader title="เข้าสู่พื้นที่ทำงานของครู" subtitle="จัดการคาบเรียนประจำวันอย่างรวดเร็วและปลอดภัย" /></View>
    <View style={styles.form}><FormField label="อีเมล" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} /><FormField label="รหัสผ่าน" autoComplete="current-password" secureTextEntry value={password} onChangeText={setPassword} />{error ? <ThemedText accessibilityRole="alert" tone="danger" style={styles.message}>{error}</ThemedText> : null}<AppButton label={pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"} disabled={pending || !email.trim() || !password} onPress={() => void submit()} /><AppButton label="สมัครใช้งาน" tone="secondary" onPress={() => router.push("/(auth)/register")} /><ThemedText tone="muted" style={styles.help}>บัญชีผู้บริหารจัดการโรงเรียนผ่านเว็บ Classroom OS ส่วนแอปนี้เน้นงานประจำวันของครู</ThemedText></View>
  </SafeScreen></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ flex: { flex: 1 }, hero: { marginTop: 48, gap: spacing.lg }, brand: { fontWeight: "800", fontSize: 17 }, form: { gap: spacing.md }, message: { lineHeight: 22 }, help: { textAlign: "center", lineHeight: 21 } });
