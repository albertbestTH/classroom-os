import type { VerificationRequestResult } from "@classroom-os/types";
import { router } from "expo-router";
import { useState, type ComponentProps } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { AppButton, AppHeader, Card, FormField, SafeScreen, ThemedText } from "@/components/ui/primitives";
import { radius, spacing, touchTargets } from "@/constants/tokens";
import { useTheme } from "@/features/theme/theme-context";
import { apiRequest } from "@/lib/api-client";
import { thaiErrorMessage } from "@/lib/api-error";

const T = {
  title: "\u0e25\u0e37\u0e21\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19",
  subtitle:
    "\u0e15\u0e31\u0e49\u0e07\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e43\u0e2b\u0e21\u0e48\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e1b\u0e25\u0e2d\u0e14\u0e20\u0e31\u0e22 \u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e17\u0e35\u0e48\u0e40\u0e02\u0e49\u0e32\u0e2a\u0e39\u0e48\u0e23\u0e30\u0e1a\u0e1a\u0e04\u0e49\u0e32\u0e07\u0e2d\u0e22\u0e39\u0e48\u0e08\u0e30\u0e16\u0e39\u0e01\u0e43\u0e2b\u0e49\u0e2d\u0e2d\u0e01\u0e08\u0e32\u0e01\u0e23\u0e30\u0e1a\u0e1a\u0e2b\u0e25\u0e31\u0e07\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e23\u0e2b\u0e31\u0e2a",
  email: "\u0e2d\u0e35\u0e40\u0e21\u0e25",
  request: "\u0e02\u0e2d\u0e15\u0e31\u0e49\u0e07\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e43\u0e2b\u0e21\u0e48",
  requesting: "\u0e01\u0e33\u0e25\u0e31\u0e07\u0e2a\u0e48\u0e07\u0e04\u0e33\u0e02\u0e2d...",
  token: "\u0e23\u0e2b\u0e31\u0e2a\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19",
  devToken:
    "\u0e23\u0e2b\u0e31\u0e2a\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e2a\u0e33\u0e2b\u0e23\u0e31\u0e1a\u0e2a\u0e20\u0e32\u0e1e\u0e41\u0e27\u0e14\u0e25\u0e49\u0e2d\u0e21\u0e1e\u0e31\u0e12\u0e19\u0e32",
  newPassword: "\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e43\u0e2b\u0e21\u0e48",
  confirmNewPassword:
    "\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e43\u0e2b\u0e21\u0e48",
  revealPassword: "\u0e01\u0e14\u0e04\u0e49\u0e32\u0e07\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e41\u0e2a\u0e14\u0e07\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19",
  passwordHelp:
    "\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e19\u0e49\u0e2d\u0e22 12 \u0e15\u0e31\u0e27 \u0e21\u0e35\u0e15\u0e31\u0e27\u0e1e\u0e34\u0e21\u0e1e\u0e4c\u0e43\u0e2b\u0e0d\u0e48 \u0e15\u0e31\u0e27\u0e1e\u0e34\u0e21\u0e1e\u0e4c\u0e40\u0e25\u0e47\u0e01 \u0e15\u0e31\u0e27\u0e40\u0e25\u0e02 \u0e41\u0e25\u0e30\u0e2a\u0e31\u0e0d\u0e25\u0e31\u0e01\u0e29\u0e13\u0e4c",
  confirm: "\u0e15\u0e31\u0e49\u0e07\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e43\u0e2b\u0e21\u0e48",
  confirming: "\u0e01\u0e33\u0e25\u0e31\u0e07\u0e15\u0e31\u0e49\u0e07\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19...",
  backToLogin: "\u0e01\u0e25\u0e31\u0e1a\u0e44\u0e1b\u0e40\u0e02\u0e49\u0e32\u0e2a\u0e39\u0e48\u0e23\u0e30\u0e1a\u0e1a",
  requested:
    "\u0e16\u0e49\u0e32\u0e21\u0e35\u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e19\u0e35\u0e49\u0e43\u0e19\u0e23\u0e30\u0e1a\u0e1a \u0e40\u0e23\u0e32\u0e08\u0e30\u0e2a\u0e48\u0e07\u0e02\u0e31\u0e49\u0e19\u0e15\u0e2d\u0e19\u0e15\u0e31\u0e49\u0e07\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e43\u0e2b\u0e21\u0e48\u0e43\u0e2b\u0e49",
  mismatch:
    "\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e43\u0e2b\u0e21\u0e48\u0e41\u0e25\u0e30\u0e0a\u0e48\u0e2d\u0e07\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e44\u0e21\u0e48\u0e15\u0e23\u0e07\u0e01\u0e31\u0e19",
  resetDone:
    "\u0e15\u0e31\u0e49\u0e07\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e43\u0e2b\u0e21\u0e48\u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22\u0e41\u0e25\u0e49\u0e27 \u0e01\u0e23\u0e38\u0e13\u0e32\u0e40\u0e02\u0e49\u0e32\u0e2a\u0e39\u0e48\u0e23\u0e30\u0e1a\u0e1a\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07",
};

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function requestReset() {
    setPending(true);
    setMessage("");
    setToken("");
    try {
      const result = await apiRequest<VerificationRequestResult>("/api/password-reset", {
        method: "POST",
        body: { email },
        retryReads: 0,
      });
      setToken(result.developmentToken ?? "");
      setMessage(T.requested);
    } catch (error) {
      setMessage(thaiErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  async function confirmReset() {
    setPending(true);
    setMessage("");
    if (newPassword !== confirmNewPassword) {
      setMessage(T.mismatch);
      setPending(false);
      return;
    }
    try {
      await apiRequest("/api/password-reset/confirm", {
        method: "POST",
        body: { token, newPassword },
        retryReads: 0,
      });
      setMessage(T.resetDone);
      setToken("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      setMessage(thaiErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <SafeScreen>
      <AppHeader title={T.title} subtitle={T.subtitle} />
      <Card>
        <Field label={T.email} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        <AppButton label={pending ? T.requesting : T.request} disabled={pending || !email.trim()} onPress={() => void requestReset()} />
        {token ? <Text style={[styles.token, { color: colors.warning, backgroundColor: colors.warningSoft }]}>{T.devToken}: {token}</Text> : null}
      </Card>
      <Card>
        <Field label={T.token} value={token} onChangeText={setToken} autoCapitalize="none" />
        <PasswordField
          label={T.newPassword}
          value={newPassword}
          onChangeText={setNewPassword}
          visible={newPasswordVisible}
          onRevealStart={() => setNewPasswordVisible(true)}
          onRevealEnd={() => setNewPasswordVisible(false)}
          colors={colors}
        />
        <PasswordField
          label={T.confirmNewPassword}
          value={confirmNewPassword}
          onChangeText={setConfirmNewPassword}
          visible={confirmPasswordVisible}
          onRevealStart={() => setConfirmPasswordVisible(true)}
          onRevealEnd={() => setConfirmPasswordVisible(false)}
          colors={colors}
        />
        <ThemedText tone="muted" style={styles.help}>{T.passwordHelp}</ThemedText>
        <AppButton label={pending ? T.confirming : T.confirm} tone="secondary" disabled={pending || !token || !newPassword || !confirmNewPassword} onPress={() => void confirmReset()} />
      </Card>
      {message ? <Text accessibilityRole="alert" style={[styles.message, { color: colors.primaryDark }]}>{message}</Text> : null}
      <View style={styles.actions}><AppButton label={T.backToLogin} tone="secondary" onPress={() => router.replace("/(auth)/login")} /></View>
    </SafeScreen>
  );
}

type FieldProps = ComponentProps<typeof FormField>;
function Field(props: FieldProps) { return <FormField {...props} />; }

const styles = StyleSheet.create({
  token: { borderRadius: 12, lineHeight: 22, padding: spacing.md, fontWeight: "700" },
  message: { lineHeight: 22, fontWeight: "700" },
  help: { lineHeight: 21 },
  passwordBox: {
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: touchTargets.comfortable,
    paddingLeft: spacing.md,
  },
  passwordField: { gap: spacing.sm },
  passwordInput: { flex: 1, fontSize: 16, minHeight: touchTargets.comfortable, paddingRight: spacing.sm },
  passwordLabel: { fontWeight: "700" },
  passwordToggle: { minHeight: touchTargets.minimum, minWidth: touchTargets.minimum, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
  pressed: { opacity: 0.6 },
  actions: { gap: spacing.md },
});

type PasswordFieldProps = {
  label: string;
  value: string;
  onChangeText(value: string): void;
  visible: boolean;
  onRevealStart(): void;
  onRevealEnd(): void;
  colors: ReturnType<typeof useTheme>["colors"];
};

function PasswordField({ label, value, onChangeText, visible, onRevealStart, onRevealEnd, colors }: PasswordFieldProps) {
  return (
    <View style={styles.passwordField}>
      <ThemedText style={styles.passwordLabel}>{label}</ThemedText>
      <View style={[styles.passwordBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TextInput
          accessibilityLabel={label}
          autoComplete="new-password"
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
          style={({ pressed }) => [styles.passwordToggle, pressed && styles.pressed]}
        >
          <EyeIcon color={colors.primaryDark} />
        </Pressable>
      </View>
    </View>
  );
}

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
