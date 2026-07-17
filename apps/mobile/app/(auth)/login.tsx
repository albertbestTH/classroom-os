import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";

import { AppButton, AppHeader, SafeScreen } from "@/components/ui/primitives";
import { colors, radius, spacing, touchTarget } from "@/constants/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { thaiErrorMessage } from "@/lib/api-error";

export default function LoginScreen() {
  const { login, message } = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false); const [error, setError] = useState<string | null>(message);
  async function submit() { setPending(true); setError(null); try { await login(email, password); } catch (value) { setError(thaiErrorMessage(value)); } finally { setPending(false); } }
  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}><SafeScreen><View style={styles.hero}><Text style={styles.brand}>Classroom OS</Text><AppHeader title="เข้าสู่พื้นที่ทำงานของครู" subtitle="จัดการคาบเรียนประจำวันอย่างรวดเร็วและปลอดภัย" /></View><View style={styles.form}><Text style={styles.label}>อีเมล</Text><TextInput accessibilityLabel="อีเมล" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} style={styles.input} /><Text style={styles.label}>รหัสผ่าน</Text><TextInput accessibilityLabel="รหัสผ่าน" autoComplete="current-password" secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}<AppButton label={pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"} disabled={pending || !email.trim() || !password} onPress={() => void submit()} /><Text style={styles.help}>บัญชีผู้บริหารใช้งานการจัดการโรงเรียนผ่านเว็บ Classroom OS</Text></View></SafeScreen></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ flex: { flex: 1 }, hero: { marginTop: 48, gap: spacing.lg }, brand: { color: colors.primary, fontWeight: "800", fontSize: 17 }, form: { gap: spacing.sm }, label: { color: colors.text, fontWeight: "700", marginTop: spacing.sm }, input: { minHeight: touchTarget, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: spacing.md, fontSize: 16 }, error: { color: colors.danger, lineHeight: 22 }, help: { color: colors.muted, textAlign: "center", lineHeight: 21 } });
