import type { TodayClassResult } from "@classroom-os/types";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AppButton, Card, StatusBadge } from "@/components/ui/primitives";
import { colors, spacing } from "@/constants/tokens";

const labels = { scheduled: "รอเริ่ม", live: "LIVE", completed: "เสร็จแล้ว", cancelled: "ยกเลิก", missed: "เลยเวลา" } as const;
export function SessionCard({ item, primary = false, onStart }: { item: TodayClassResult; primary?: boolean; onStart?: (item: TodayClassResult) => void }) {
  const time = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(new Date(item.scheduledStart));
  const action = item.status === "live" ? "กลับเข้าสู่คาบ" : item.status === "scheduled" ? "เริ่มคาบ" : item.status === "completed" ? "ดูสรุป" : null;
  return <Card><View style={styles.row}><View style={styles.flex}><Text style={styles.classroom}>{item.timetableEntry.classroomName}</Text><Text style={styles.subject}>{item.timetableEntry.subjectName} · {time} น.</Text></View><StatusBadge label={labels[item.status]} tone={item.status === "live" ? "live" : item.status === "completed" ? "success" : item.status === "missed" || item.status === "cancelled" ? "danger" : "neutral"} /></View>{action ? <AppButton label={action} tone={primary ? "primary" : "secondary"} onPress={() => { if (item.status === "scheduled") onStart?.(item); else if (item.session) router.push(item.status === "completed" ? `/sessions/${item.session.id}/summary` : `/sessions/${item.session.id}`); }} /> : null}</Card>;
}
const styles = StyleSheet.create({ row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md }, flex: { flex: 1 }, classroom: { color: colors.text, fontSize: 18, fontWeight: "800" }, subject: { color: colors.muted, marginTop: 4, lineHeight: 21 } });
