import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { AppButton, AppHeader, FormField, SafeScreen, ThemedText } from "@/components/ui/primitives";
import { radius, spacing, touchTargets } from "@/constants/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { useTheme } from "@/features/theme/theme-context";
import { thaiErrorMessage } from "@/lib/api-error";

const T = {
  title: "\u0e40\u0e02\u0e49\u0e32\u0e2a\u0e39\u0e48\u0e1e\u0e37\u0e49\u0e19\u0e17\u0e35\u0e48\u0e17\u0e33\u0e07\u0e32\u0e19\u0e02\u0e2d\u0e07\u0e04\u0e23\u0e39",
  subtitle:
    "\u0e08\u0e31\u0e14\u0e01\u0e32\u0e23\u0e04\u0e32\u0e1a\u0e40\u0e23\u0e35\u0e22\u0e19\u0e1b\u0e23\u0e30\u0e08\u0e33\u0e27\u0e31\u0e19\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e23\u0e27\u0e14\u0e40\u0e23\u0e47\u0e27\u0e41\u0e25\u0e30\u0e1b\u0e25\u0e2d\u0e14\u0e20\u0e31\u0e22",
  email: "\u0e2d\u0e35\u0e40\u0e21\u0e25",
  password: "\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19",
  login: "\u0e40\u0e02\u0e49\u0e32\u0e2a\u0e39\u0e48\u0e23\u0e30\u0e1a\u0e1a",
  loggingIn: "\u0e01\u0e33\u0e25\u0e31\u0e07\u0e40\u0e02\u0e49\u0e32\u0e2a\u0e39\u0e48\u0e23\u0e30\u0e1a\u0e1a...",
  forgotPassword: "\u0e25\u0e37\u0e21\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19?",
  revealPassword: "\u0e01\u0e14\u0e04\u0e49\u0e32\u0e07\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e41\u0e2a\u0e14\u0e07\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19",
  register: "\u0e2a\u0e21\u0e31\u0e04\u0e23\u0e43\u0e0a\u0e49\u0e07\u0e32\u0e19",
  help:
    "\u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e1c\u0e39\u0e49\u0e1a\u0e23\u0e34\u0e2b\u0e32\u0e23\u0e08\u0e31\u0e14\u0e01\u0e32\u0e23\u0e42\u0e23\u0e07\u0e40\u0e23\u0e35\u0e22\u0e19\u0e1c\u0e48\u0e32\u0e19\u0e40\u0e27\u0e47\u0e1a Classroom OS \u0e2a\u0e48\u0e27\u0e19\u0e41\u0e2d\u0e1b\u0e19\u0e35\u0e49\u0e40\u0e19\u0e49\u0e19\u0e07\u0e32\u0e19\u0e1b\u0e23\u0e30\u0e08\u0e33\u0e27\u0e31\u0e19\u0e02\u0e2d\u0e07\u0e04\u0e23\u0e39",
};

export default function LoginScreen() {
  const { login, message } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(message);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      await login(email, password);
    } catch (value) {
      setError(thaiErrorMessage(value));
    } finally {
      setPending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SafeScreen>
        <View style={styles.hero}>
          <ThemedText tone="primary" style={styles.brand}>
            Classroom OS
          </ThemedText>
          <AppHeader title={T.title} subtitle={T.subtitle} />
        </View>
        <View style={styles.form}>
          <FormField
            label={T.email}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <PasswordField
            label={T.password}
            autoComplete="current-password"
            value={password}
            onChangeText={setPassword}
            visible={passwordVisible}
            onRevealStart={() => setPasswordVisible(true)}
            onRevealEnd={() => setPasswordVisible(false)}
            colors={colors}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={T.forgotPassword}
            onPress={() => router.push("/(auth)/forgot-password")}
            style={({ pressed }) => [styles.forgotLink, pressed && styles.pressedLink]}
          >
            <ThemedText tone="primary" style={styles.forgotLinkText}>
              {T.forgotPassword}
            </ThemedText>
          </Pressable>
          {error ? (
            <ThemedText accessibilityRole="alert" tone="danger" style={styles.message}>
              {error}
            </ThemedText>
          ) : null}
          <AppButton
            label={pending ? T.loggingIn : T.login}
            disabled={pending || !email.trim() || !password}
            onPress={() => void submit()}
          />
          <AppButton label={T.register} tone="secondary" onPress={() => router.push("/(auth)/register")} />
          <ThemedText tone="muted" style={styles.help}>
            {T.help}
          </ThemedText>
        </View>
      </SafeScreen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { marginTop: 48, gap: spacing.lg },
  brand: { fontWeight: "800", fontSize: 17 },
  form: { gap: spacing.md },
  field: { gap: spacing.sm },
  fieldLabel: { fontWeight: "700" },
  forgotLink: { alignSelf: "flex-end", minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.xs },
  forgotLinkText: { fontSize: 14, fontWeight: "700", textDecorationLine: "underline" },
  message: { lineHeight: 22 },
  passwordBox: {
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: touchTargets.comfortable,
    paddingLeft: spacing.md,
  },
  passwordInput: { flex: 1, fontSize: 16, minHeight: touchTargets.comfortable, paddingRight: spacing.sm },
  passwordToggle: { minHeight: touchTargets.minimum, minWidth: touchTargets.minimum, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
  help: { textAlign: "center", lineHeight: 21 },
  pressedLink: { opacity: 0.6 },
});

function EyeIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden>
      <Path
        d="M2.25 12s3.5-6.25 9.75-6.25S21.75 12 21.75 12 18.25 18.25 12 18.25 2.25 12 2.25 12Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={2} />
    </Svg>
  );
}

type PasswordFieldProps = {
  label: string;
  value: string;
  onChangeText(value: string): void;
  autoComplete: "current-password" | "new-password";
  visible: boolean;
  onRevealStart(): void;
  onRevealEnd(): void;
  colors: ReturnType<typeof useTheme>["colors"];
};

function PasswordField({ label, value, onChangeText, autoComplete, visible, onRevealStart, onRevealEnd, colors }: PasswordFieldProps) {
  return (
    <View style={styles.field}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <View style={[styles.passwordBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TextInput
          accessibilityLabel={label}
          autoComplete={autoComplete}
          secureTextEntry={!visible}
          value={value}
          onChangeText={onChangeText}
          style={[styles.passwordInput, { color: colors.text }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={T.revealPassword}
          accessibilityState={{ selected: visible }}
          onPressIn={onRevealStart}
          onPressOut={onRevealEnd}
          style={({ pressed }) => [styles.passwordToggle, pressed && styles.pressedLink]}
        >
          <EyeIcon color={colors.primaryDark} />
        </Pressable>
      </View>
    </View>
  );
}
