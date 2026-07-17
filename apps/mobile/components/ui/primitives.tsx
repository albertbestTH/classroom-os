import type { PropsWithChildren, ReactNode } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View, type PressableProps, type ScrollViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radius, spacing, touchTarget } from "@/constants/tokens";

export function SafeScreen({ children, refreshControl }: PropsWithChildren<{ refreshControl?: ScrollViewProps["refreshControl"] }>) {
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.screen} refreshControl={refreshControl} keyboardShouldPersistTaps="handled">{children}</ScrollView></SafeAreaView>;
}
export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) { return <View style={styles.header}><Text accessibilityRole="header" style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}</View>; }
export function Card({ children }: PropsWithChildren) { return <View style={styles.card}>{children}</View>; }
export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) { return <View style={styles.row}><Text accessibilityRole="header" style={styles.section}>{title}</Text>{action}</View>; }

type ButtonProps = PressableProps & { label: string; tone?: "primary" | "secondary" | "danger" };
export function AppButton({ label, tone = "primary", disabled, style, ...props }: ButtonProps) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: Boolean(disabled) }} disabled={disabled} style={(state) => [styles.button, tone === "secondary" && styles.secondaryButton, tone === "danger" && styles.dangerButton, state.pressed && styles.pressed, disabled && styles.disabled, typeof style === "function" ? style(state) : style]} {...props}><Text style={[styles.buttonText, tone === "secondary" && styles.secondaryText]}>{label}</Text></Pressable>;
}
export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: "success" | "warning" | "danger" | "live" | "neutral" }) { return <View style={[styles.badge, tone === "success" && styles.successBadge, tone === "warning" && styles.warningBadge, tone === "danger" && styles.dangerBadge, tone === "live" && styles.liveBadge]}><Text style={styles.badgeText}>{label}</Text></View>; }
export function MetricCard({ label, value }: { label: string; value: string | number }) { return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.muted}>{label}</Text></View>; }
export function EmptyState({ title, description }: { title: string; description: string }) { return <Card><Text style={styles.section}>{title}</Text><Text style={styles.muted}>{description}</Text></Card>; }
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) { return <Card><Text accessibilityRole="alert" style={styles.error}>{message}</Text>{onRetry ? <AppButton label="ลองใหม่" tone="secondary" onPress={onRetry} /> : null}</Card>; }
export function LoadingSkeleton() { return <View accessibilityLabel="กำลังโหลด" style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.muted}>กำลังโหลดข้อมูล…</Text></View>; }
export function OfflineBanner({ visible }: { visible: boolean }) { return visible ? <View style={styles.offline}><Text style={styles.offlineText}>ออฟไลน์ · ข้อมูลอาจยังไม่เป็นปัจจุบัน</Text></View> : null; }
export function ConfirmationModal({ visible, title, description, confirmLabel, onConfirm, onCancel, destructive }: { visible: boolean; title: string; description: string; confirmLabel: string; onConfirm(): void; onCancel(): void; destructive?: boolean }) { return <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}><View style={styles.overlay}><View style={styles.modal}><Text accessibilityRole="header" style={styles.section}>{title}</Text><Text style={styles.muted}>{description}</Text><AppButton label={confirmLabel} tone={destructive ? "danger" : "primary"} onPress={onConfirm} /><AppButton label="ยกเลิก" tone="secondary" onPress={onCancel} /></View></View></Modal>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, screen: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 40 },
  header: { gap: spacing.xs }, title: { color: colors.text, fontSize: 28, fontWeight: "800", lineHeight: 36 }, muted: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, shadowColor: "#111827", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md }, section: { color: colors.text, fontSize: 19, fontWeight: "700", lineHeight: 26 },
  button: { minHeight: touchTarget, borderRadius: radius.md, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, justifyContent: "center", alignItems: "center" }, secondaryButton: { backgroundColor: colors.primarySoft, borderColor: colors.primary, borderWidth: 1 }, dangerButton: { backgroundColor: colors.danger }, pressed: { opacity: 0.75 }, disabled: { opacity: 0.45 }, buttonText: { color: colors.surface, fontWeight: "700", fontSize: 16 }, secondaryText: { color: colors.primaryDark },
  badge: { alignSelf: "flex-start", borderRadius: radius.pill, backgroundColor: "#F3F4F6", paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, successBadge: { backgroundColor: "#DCFCE7" }, warningBadge: { backgroundColor: "#FEF3C7" }, dangerBadge: { backgroundColor: "#FEE2E2" }, liveBadge: { backgroundColor: "#DBEAFE" }, badgeText: { color: colors.text, fontSize: 13, fontWeight: "700" },
  metric: { flex: 1, minWidth: 130, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, gap: spacing.xs }, metricValue: { color: colors.text, fontSize: 28, fontWeight: "800" }, error: { color: colors.danger, fontSize: 15, lineHeight: 22 }, loading: { minHeight: 240, alignItems: "center", justifyContent: "center", gap: spacing.md }, offline: { backgroundColor: "#FEF3C7", padding: spacing.md }, offlineText: { color: "#92400E", textAlign: "center", fontWeight: "600" }, overlay: { flex: 1, backgroundColor: "rgba(17,24,39,0.55)", justifyContent: "flex-end" }, modal: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, gap: spacing.lg },
});
export const uiStyles = styles;
