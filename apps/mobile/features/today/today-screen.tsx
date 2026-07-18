import type { ClassSessionResult, TodayClassResult, TodayTimetableResult } from "@classroom-os/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { RefreshControl, StyleSheet, Text, View } from "react-native";

import { SessionCard } from "@/components/classroom/session-card";
import {
  AppHeader,
  Card,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  MetricCard,
  ProgressBar,
  SafeScreen,
  SectionHeader,
  StatusBadge,
} from "@/components/ui/primitives";
import { colors, spacing } from "@/constants/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { useAuthenticatedQuery } from "@/hooks/use-authenticated-query";
import { apiRequest } from "@/lib/api-client";
import { thaiErrorMessage } from "@/lib/api-error";

export function TodayScreen() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const today = useAuthenticatedQuery<TodayTimetableResult>(["today"], "/api/me/today");
  const start = useMutation({
    mutationFn: async (item: TodayClassResult) => {
      const session = item.session ?? await apiRequest<ClassSessionResult>(`/api/timetable/${item.timetableEntry.id}/materialize`, {
        method: "POST",
        token,
        body: { localDate: today.data?.localDate },
      });
      return apiRequest<ClassSessionResult>(`/api/sessions/${session.id}/start`, { method: "POST", token, body: {} });
    },
    onSuccess: async (session) => {
      await queryClient.invalidateQueries({ queryKey: ["today"] });
      router.push(`/sessions/${session.id}`);
    },
  });

  if (today.isLoading) return <LoadingSkeleton />;
  if (today.error) return <SafeScreen><ErrorState message={thaiErrorMessage(today.error)} onRetry={() => void today.refetch()} /></SafeScreen>;

  const data = today.data!;
  const live = data.classes.find((item) => item.status === "live");
  const next = data.classes.find((item) => item.status === "scheduled");
  const attendanceComplete = data.classes.filter((item) => item.session && item.session.attendanceRecordedCount >= item.session.enrolledStudentCount).length;
  const actionCount = data.missedCount + data.incompleteAttendanceCount;
  const date = new Intl.DateTimeFormat("th-TH", { dateStyle: "full" }).format(new Date(`${data.localDate}T12:00:00`));

  return <SafeScreen refreshControl={<RefreshControl refreshing={today.isRefetching} onRefresh={() => void today.refetch()} tintColor={colors.primary} />}>
    <AppHeader title={`สวัสดีครับ ครู${user?.firstName ?? ""}`} subtitle={`${user?.schoolName ?? ""} · ${date}`} />

    {live ? <><SectionHeader title="คาบที่กำลังสอน" /><SessionCard item={live} primary /></> : next ? <><SectionHeader title="คาบถัดไป" /><SessionCard item={next} primary onStart={(item) => start.mutate(item)} /></> : null}
    {start.error ? <Text accessibilityRole="alert" style={styles.error}>{thaiErrorMessage(start.error)}</Text> : null}

    <SectionHeader title="แดชบอร์ดวันนี้" action={actionCount > 0 ? <StatusBadge label={`ติดตาม ${actionCount}`} tone="warning" /> : <StatusBadge label="เรียบร้อย" tone="success" />} />
    <View style={styles.metrics}>
      <MetricCard label="คาบทั้งหมด" value={data.classes.length} />
      <MetricCard label="เสร็จแล้ว" value={data.completedCount} />
      <MetricCard label="เช็กชื่อครบ" value={attendanceComplete} />
      <MetricCard label="ยกเลิก/พลาด" value={data.cancelledCount + data.missedCount} />
    </View>
    <Card>
      <ProgressBar label="ความคืบหน้าคาบเรียน" value={data.completedCount} max={data.classes.length} tone="success" />
      <ProgressBar label="ความครบถ้วนของการเช็กชื่อ" value={attendanceComplete} max={data.classes.length} tone={actionCount > 0 ? "warning" : "success"} />
    </Card>
    {actionCount > 0 ? <Card>
      <Text style={styles.actionTitle}>รายการที่ควรตรวจสอบ</Text>
      {data.missedCount > 0 ? <Text style={styles.actionText}>• คาบที่พลาด {data.missedCount} คาบ</Text> : null}
      {data.incompleteAttendanceCount > 0 ? <Text style={styles.actionText}>• เช็กชื่อยังไม่ครบ {data.incompleteAttendanceCount} คาบ</Text> : null}
    </Card> : null}

    <SectionHeader title="ตารางวันนี้" />
    {data.classes.length ? data.classes.map((item) => <SessionCard key={item.timetableEntry.id} item={item} onStart={(value) => start.mutate(value)} />) : <EmptyState title="วันนี้ไม่มีคาบสอน" description="พักผ่อนหรือเตรียมคาบถัดไปได้เลย" />}
  </SafeScreen>;
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  error: { color: colors.danger },
  actionTitle: { color: colors.warning, fontSize: 17, fontWeight: "800" },
  actionText: { color: colors.text, fontSize: 15, lineHeight: 22 },
});
