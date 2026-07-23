import type { ClassSessionResult, SessionTimelineEventResult } from "@classroom-os/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";

import { AppButton, AppHeader, Card, ConfirmationModal, ErrorState, LoadingSkeleton, OfflineBanner, ProgressBar, SafeScreen, StatusBadge, ThemedText, Timeline, TimelineItem } from "@/components/ui/primitives";
import { spacing } from "@/constants/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { useAuthenticatedQuery } from "@/hooks/use-authenticated-query";
import { apiRequest } from "@/lib/api-client";
import { thaiErrorMessage } from "@/lib/api-error";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { formatElapsed, formatRemaining } from "./session-time";

export function SessionScreen({ id }: { id: string }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();
  const [confirm, setConfirm] = useState(false);
  const [now, setNow] = useState(0);
  const session = useAuthenticatedQuery<ClassSessionResult>(["session", id], `/api/sessions/${id}`);
  const timeline = useAuthenticatedQuery<SessionTimelineEventResult[]>(["timeline", id], `/api/sessions/${id}/timeline`);

  useEffect(() => {
    const initial = setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") setNow(Date.now()); });
    return () => { clearTimeout(initial); clearInterval(timer); subscription.remove(); };
  }, []);

  const end = useMutation({
    mutationFn: () => apiRequest<ClassSessionResult>(`/api/sessions/${id}/end`, { method: "POST", token, body: { expectedUpdatedAt: session.data?.updatedAt } }),
    onSuccess: async () => {
      setConfirm(false);
      await queryClient.invalidateQueries({ queryKey: ["today"] });
      router.replace(`/sessions/${id}/summary`);
    },
  });

  if (session.isLoading) return <LoadingSkeleton />;
  if (session.error || !session.data) return <SafeScreen><AppButton label="← กลับไปตารางสอน" tone="secondary" onPress={() => router.replace("/(tabs)/classes")} /><ErrorState error={session.error} onRetry={() => void session.refetch()} /></SafeScreen>;

  const data = session.data;
  const incomplete = data.attendanceRecordedCount < data.enrolledStudentCount;
  return <SafeScreen>
    <OfflineBanner visible={!isOnline} lastUpdated={session.dataUpdatedAt} />
    <AppButton label="← กลับไปตารางสอน" tone="secondary" onPress={() => router.replace("/(tabs)/classes")} />
    <AppHeader title={data.classroomName} subtitle={`${data.subjectName} · ${data.termName}`} />
    <View style={styles.row}>
      <StatusBadge label={data.status === "live" ? "LIVE · กำลังสอน" : data.status.toUpperCase()} tone={data.status === "live" ? "live" : data.status === "completed" ? "success" : data.status === "cancelled" ? "danger" : "neutral"} />
      {data.status === "live" ? <View style={styles.timers}><ThemedText accessibilityLabel={`เวลาที่สอน ${formatElapsed(data.startedAt, now)}`} tone="primary" style={styles.timer}>{formatElapsed(data.startedAt, now)}</ThemedText><ThemedText tone="muted" style={styles.remaining}>เหลือตามตาราง {formatRemaining(data.scheduledEnd, now)}</ThemedText></View> : null}
    </View>
    <Card>
      <ThemedText style={styles.heading}>การเช็กชื่อ</ThemedText>
      <ThemedText tone="muted" style={styles.muted}>บันทึกแล้ว {data.attendanceRecordedCount}/{data.enrolledStudentCount} คน</ThemedText>
      <ProgressBar label="ความคืบหน้าการเช็กชื่อ" value={data.attendanceRecordedCount} max={data.enrolledStudentCount} tone={incomplete ? "warning" : "success"} />
      {data.status === "live" ? <AppButton label="เช็กชื่อ" onPress={() => router.push(`/sessions/${id}/attendance?classroomId=${data.classroomId}`)} /> : null}
      {data.status === "live" ? <AppButton label="คะแนนด่วน" tone="secondary" onPress={() => router.push(`/sessions/${id}/scores?teachingAssignmentId=${data.teachingAssignmentId}&classroomId=${data.classroomId}`)} /> : null}
    </Card>
    <Card>
      <ThemedText style={styles.heading}>ไทม์ไลน์คาบเรียน</ThemedText>
      {timeline.data?.length ? <Timeline>{timeline.data.map((event) => <TimelineItem key={event.id} title={event.eventType} description={new Intl.DateTimeFormat("th-TH", { timeStyle: "short" }).format(new Date(event.createdAt))} status="complete" />)}</Timeline> : <ThemedText tone="muted" style={styles.muted}>ยังไม่มีกิจกรรมเพิ่มเติม</ThemedText>}
    </Card>
    {data.status === "live" ? <AppButton label="จบคาบเรียน" tone="danger" disabled={!isOnline} accessibilityHint={!isOnline ? "ต้องเชื่อมต่ออินเทอร์เน็ตก่อนจบคาบ" : undefined} onPress={() => setConfirm(true)} /> : null}
    {end.error ? <ThemedText accessibilityRole="alert" tone="danger">{thaiErrorMessage(end.error)} กรุณาโหลดสถานะใหม่</ThemedText> : null}
    <ConfirmationModal visible={confirm} title="ยืนยันจบคาบ" description={`${data.classroomName} · ${data.subjectName}${incomplete ? "\nยังเช็กชื่อไม่ครบ กรุณาตรวจสอบก่อนยืนยัน" : ""}`} confirmLabel={end.isPending ? "กำลังจบคาบ…" : "ยืนยันจบคาบ"} destructive onConfirm={() => { if (!end.isPending) end.mutate(); }} onCancel={() => setConfirm(false)} />
  </SafeScreen>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md },
  timers: { alignItems: "flex-end", gap: 2 },
  timer: { fontSize: 24, fontWeight: "800", fontVariant: ["tabular-nums"] },
  remaining: { fontSize: 13, fontVariant: ["tabular-nums"] },
  heading: { fontSize: 18, fontWeight: "700" },
  muted: { lineHeight: 22 },
});
