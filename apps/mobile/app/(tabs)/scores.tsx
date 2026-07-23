import type { TodayTimetableResult } from "@classroom-os/types";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AppButton, AppHeader, Card, EmptyState, ErrorState, LoadingSkeleton, MetricCard, OfflineBanner, SafeScreen, SectionHeader, StatusBadge } from "@/components/ui/primitives";
import { spacing } from "@/constants/tokens";
import { useTheme } from "@/features/theme/theme-context";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useAuthenticatedQuery } from "@/hooks/use-authenticated-query";
import { thaiErrorMessage } from "@/lib/api-error";

export default function RecordsScreen() {
  const { colors: themeColors } = useTheme();
  const { isOnline } = useNetworkStatus();
  const today = useAuthenticatedQuery<TodayTimetableResult>(["today"], "/api/me/today");
  if (today.isLoading) return <LoadingSkeleton />;
  if (today.error || !today.data) return <SafeScreen><ErrorState message={thaiErrorMessage(today.error)} onRetry={() => void today.refetch()} /></SafeScreen>;

  const live = today.data.classes.find((item) => item.status === "live" && item.session);
  const completed = today.data.classes.filter((item) => item.status === "completed" && item.session);
  const recorded = today.data.classes.reduce((sum, item) => sum + (item.session?.attendanceRecordedCount ?? 0), 0);
  const enrolled = today.data.classes.reduce((sum, item) => sum + (item.session?.enrolledStudentCount ?? 0), 0);

  return <SafeScreen>
    <OfflineBanner visible={!isOnline} lastUpdated={today.dataUpdatedAt} />
    <AppHeader title="บันทึก" subtitle="งานระหว่างคาบและรายการที่ต้องติดตาม" />
    <View style={styles.metrics}>
      <MetricCard label="เช็กชื่อวันนี้" value={`${recorded}/${enrolled}`} />
      <MetricCard label="คาบเสร็จแล้ว" value={completed.length} />
    </View>
    <SectionHeader title="คาบปัจจุบัน" action={live ? <StatusBadge label="LIVE" tone="live" /> : undefined} />
    {live?.session ? <Card>
      <Text style={[styles.title, { color: themeColors.text }]}>{live.timetableEntry.classroomName}</Text>
      <Text style={[styles.subtitle, { color: themeColors.text }]}>{live.timetableEntry.subjectName} · นักเรียน {live.session.enrolledStudentCount} คน</Text>
      <AppButton label="เช็กชื่อและบันทึกคาบ" onPress={() => router.push(`/sessions/${live.session!.id}`)} />
    </Card> : <EmptyState title="ยังไม่มีคาบที่กำลังสอน" description="เริ่มคาบจากหน้า วันนี้ หรือตารางสอน แล้วกลับมาบันทึกได้ทันที" />}
    <SectionHeader title="คาบที่สรุปได้วันนี้" />
    {completed.length ? completed.map((item) => <Card key={item.session!.id}>
      <Text style={[styles.title, { color: themeColors.text }]}>{item.timetableEntry.classroomName}</Text>
      <Text style={[styles.subtitle, { color: themeColors.text }]}>{item.timetableEntry.subjectName} · เช็กชื่อ {item.session!.attendanceRecordedCount}/{item.session!.enrolledStudentCount}</Text>
      <AppButton label="ดูสรุปคาบ" tone="secondary" onPress={() => router.push(`/sessions/${item.session!.id}/summary`)} />
    </Card>) : <Text style={[styles.muted, { color: themeColors.muted }]}>เมื่อจบคาบ รายการสรุปจะปรากฏที่นี่</Text>}
    <Card>
      <Text style={[styles.title, { color: themeColors.text }]}>คะแนนด่วน</Text>
      <Text style={[styles.muted, { color: themeColors.muted }]}>คะแนนด่วนใช้เฉพาะงานในคาบ ส่วน Gradebook แบบละเอียดจัดการบนเว็บ</Text>
    </Card>
  </SafeScreen>;
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  title: { fontSize: 18, fontWeight: "800" }, subtitle: { fontSize: 15, lineHeight: 22 }, muted: { fontSize: 15, lineHeight: 22 },
});
