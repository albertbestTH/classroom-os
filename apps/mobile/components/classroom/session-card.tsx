import type { TodayClassResult } from "@classroom-os/types";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AppButton, Card, StatusBadge } from "@/components/ui/primitives";
import { spacing } from "@/constants/tokens";
import { useTheme } from "@/features/theme/theme-context";

const labels = { scheduled: "รอเริ่ม", live: "LIVE", completed: "เสร็จแล้ว", cancelled: "ยกเลิก", missed: "เลยเวลา" } as const;

type Props = { item: TodayClassResult; primary?: boolean; canMutate?: boolean; onStart?: (item: TodayClassResult) => void };

export function SessionCard({ item, primary = false, canMutate = true, onStart }: Props) {
  const { colors } = useTheme();
  const time = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(new Date(item.scheduledStart));
  const action = item.status === "live" ? "กลับเข้าสู่คาบ" : item.status === "scheduled" ? "เริ่มคาบ" : item.status === "completed" ? "ดูสรุป" : null;
  return <Card>
    <View style={styles.row}><View style={styles.flex}><Text style={[styles.classroom, { color: colors.text }]}>{item.timetableEntry.classroomName}</Text><Text style={[styles.subject, { color: colors.muted }]}>{item.timetableEntry.subjectName} · {time} น.</Text></View><StatusBadge label={labels[item.status]} tone={item.status === "live" ? "live" : item.status === "completed" ? "success" : item.status === "missed" || item.status === "cancelled" ? "danger" : "neutral"} /></View>
    {action ? <AppButton label={action} tone={primary ? "primary" : "secondary"} disabled={item.status === "scheduled" && !canMutate} onPress={() => { if (item.status === "scheduled") onStart?.(item); else if (item.session) router.push(item.status === "completed" ? `/sessions/${item.session.id}/summary` : `/sessions/${item.session.id}`); }} /> : null}
  </Card>;
}

const styles = StyleSheet.create({ row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md }, flex: { flex: 1 }, classroom: { fontSize: 18, fontWeight: "800" }, subject: { marginTop: 4, lineHeight: 21 } });
