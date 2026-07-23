import type { ClassSessionResult, TodayClassResult, TodayTimetableResult } from "@classroom-os/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";

import { SessionCard } from "@/components/classroom/session-card";
import { AppButton, AppHeader, Card, EmptyState, ErrorState, MetricCard, OfflineBanner, ProgressBar, SafeScreen, SectionHeader, SkeletonCard, StatusBadge, ThemedText, Timeline, TimelineItem } from "@/components/ui/primitives";
import { spacing } from "@/constants/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { useTheme } from "@/features/theme/theme-context";
import { useAuthenticatedQuery } from "@/hooks/use-authenticated-query";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { apiRequest } from "@/lib/api-client";
import { thaiErrorMessage } from "@/lib/api-error";

import { groupTodayClasses, timelineStatus } from "./today-presentation";

const statusLabels = { scheduled: "รอเริ่ม", live: "กำลังสอน", completed: "เสร็จแล้ว", cancelled: "ยกเลิก", missed: "เลยเวลา" } as const;

function formatRange(item: TodayClassResult): string {
  const formatter = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
  return `${formatter.format(new Date(item.scheduledStart))}–${formatter.format(new Date(item.scheduledEnd))} น.`;
}

export function TodayScreen() {
  const { user, token } = useAuth();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();
  const today = useAuthenticatedQuery<TodayTimetableResult>(["today"], "/api/me/today");
  const groups = useMemo(() => groupTodayClasses(today.data?.classes ?? []), [today.data?.classes]);
  const start = useMutation({
    mutationFn: async (item: TodayClassResult) => {
      const session = item.session ?? await apiRequest<ClassSessionResult>(`/api/timetable/${item.timetableEntry.id}/materialize`, { method: "POST", token, body: { localDate: today.data?.localDate } });
      return apiRequest<ClassSessionResult>(`/api/sessions/${session.id}/start`, { method: "POST", token, body: {} });
    },
    onSuccess: async (session) => { await queryClient.invalidateQueries({ queryKey: ["today"] }); router.push(`/sessions/${session.id}`); },
  });

  if (today.isLoading) return <SafeScreen><SkeletonCard /><SkeletonCard /><SkeletonCard /></SafeScreen>;
  if (today.error || !today.data) return <SafeScreen><ErrorState error={today.error} onRetry={() => void today.refetch()} /></SafeScreen>;

  const data = today.data;
  const live = data.classes.find((item) => item.status === "live");
  const next = data.classes.find((item) => item.status === "scheduled");
  const attendanceComplete = data.classes.filter((item) => item.session && item.session.attendanceRecordedCount >= item.session.enrolledStudentCount).length;
  const actionCount = data.missedCount + data.incompleteAttendanceCount;
  const remaining = Math.max(0, data.classes.length - data.completedCount - data.cancelledCount - data.missedCount);
  const date = new Intl.DateTimeFormat("th-TH", { dateStyle: "full" }).format(new Date(`${data.localDate}T12:00:00`));
  const openItem = (item: TodayClassResult) => {
    if (item.status === "scheduled" && isOnline) start.mutate(item);
    else if (item.session) router.push(item.status === "completed" ? `/sessions/${item.session.id}/summary` : `/sessions/${item.session.id}`);
  };

  return <SafeScreen stickyHeaderIndices={live ? [2] : undefined} refreshControl={<RefreshControl refreshing={today.isRefetching} onRefresh={() => void today.refetch()} tintColor={colors.primary} />}>
    <OfflineBanner visible={!isOnline} lastUpdated={today.dataUpdatedAt} />
    <AppHeader title={`สวัสดีครับ ครู${user?.firstName ?? ""}`} subtitle={`${user?.schoolName ?? ""} · ${date}`} />
    <View style={[styles.pinned, live && { backgroundColor: colors.background }]}>
      {live ? <><SectionHeader title="คาบที่กำลังสอน" action={<StatusBadge label="LIVE" tone="live" />} /><SessionCard item={live} primary /></> : next ? <><SectionHeader title="คาบถัดไป" /><SessionCard item={next} primary canMutate={isOnline} onStart={(item) => start.mutate(item)} /></> : null}
    </View>
    {start.error ? <ThemedText accessibilityRole="alert" tone="danger">{thaiErrorMessage(start.error)}</ThemedText> : null}
    <SectionHeader title="ความคืบหน้าวันนี้" action={actionCount > 0 ? <StatusBadge label={`ติดตาม ${actionCount}`} tone="warning" /> : <StatusBadge label="เรียบร้อย" tone="success" />} />
    <View style={styles.metrics}>
      <MetricCard label="คาบทั้งหมด" value={data.classes.length} /><MetricCard label="เสร็จแล้ว" value={data.completedCount} /><MetricCard label="คาบที่เหลือ" value={remaining} /><MetricCard label="เช็กชื่อครบ" value={attendanceComplete} />
    </View>
    <Card><ProgressBar label="คาบที่สอนเสร็จ" value={data.completedCount} max={data.classes.length} tone="success" /><ProgressBar label="การเช็กชื่อครบถ้วน" value={attendanceComplete} max={data.classes.length} tone={actionCount > 0 ? "warning" : "success"} /></Card>
    {actionCount > 0 ? <Card><ThemedText tone="warning" style={styles.actionTitle}>รายการที่ควรตรวจสอบ</ThemedText>{data.missedCount > 0 ? <ThemedText>• คาบที่พลาด {data.missedCount} คาบ</ThemedText> : null}{data.incompleteAttendanceCount > 0 ? <ThemedText>• เช็กชื่อยังไม่ครบ {data.incompleteAttendanceCount} คาบ</ThemedText> : null}</Card> : null}
    <SectionHeader title="ไทม์ไลน์วันนี้" />
    {data.classes.length ? ([(["ช่วงเช้า", groups.morning] as const), (["ช่วงบ่าย", groups.afternoon] as const)]).map(([label, items]) => items.length ? <Card key={label}>
      <ThemedText style={styles.groupTitle}>{label}</ThemedText>
      <Timeline>{items.map((item) => <TimelineItem key={item.timetableEntry.id} title={`${formatRange(item)} · ${item.timetableEntry.classroomName}`} description={`${item.timetableEntry.subjectName}${item.timetableEntry.room ? ` · ห้อง ${item.timetableEntry.room}` : ""}`} status={timelineStatus(item.status)}>
        <StatusBadge label={statusLabels[item.status]} tone={item.status === "live" ? "live" : item.status === "completed" ? "success" : item.status === "cancelled" || item.status === "missed" ? "danger" : "neutral"} />
        {(item.status === "scheduled" || item.status === "live" || item.status === "completed") ? <AppButton label={item.status === "scheduled" ? "เริ่มคาบ" : item.status === "live" ? "กลับเข้าสู่คาบ" : "ดูสรุป"} tone="secondary" disabled={item.status === "scheduled" && (!isOnline || start.isPending)} onPress={() => openItem(item)} /> : null}
      </TimelineItem>)}</Timeline>
    </Card> : null) : <EmptyState title="วันนี้ไม่มีคาบสอน" description="พักผ่อนหรือเตรียมคาบถัดไปได้เลย" />}
  </SafeScreen>;
}

const styles = StyleSheet.create({ pinned: { gap: spacing.md, borderRadius: 18 }, metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, actionTitle: { fontSize: 17, fontWeight: "800" }, groupTitle: { fontSize: 18, fontWeight: "800" } });
