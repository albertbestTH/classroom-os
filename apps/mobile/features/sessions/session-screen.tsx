import type { ClassSessionResult, SessionAttendanceResult, SessionTimelineEventResult } from "@classroom-os/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";

import { AppButton, AppHeader, Card, ConfirmationModal, ErrorState, LoadingSkeleton, OfflineBanner, SafeScreen, Snackbar, StatusBadge, ThemedText, Timeline, TimelineItem } from "@/components/ui/primitives";
import { AttendanceSummaryCard } from "@/components/classroom/attendance-summary-card";
import { spacing } from "@/constants/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { useAuthenticatedQuery } from "@/hooks/use-authenticated-query";
import { apiRequest } from "@/lib/api-client";
import { thaiErrorMessage } from "@/lib/api-error";
import { attendanceActionLabel, summarizeAttendance } from "@/features/attendance/attendance-summary";
import { invalidateSessionWorkflow, queryKeys } from "@/lib/query-keys";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { formatElapsed, formatRemaining } from "./session-time";

export function SessionScreen({ id, scoreSavedParam }: { id: string; scoreSavedParam?: string }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();
  const [confirm, setConfirm] = useState(false);
  const [now, setNow] = useState(0);
  const [attendanceSaved, setAttendanceSaved] = useState(() => Boolean(queryClient.getQueryData(queryKeys.attendanceSaveFeedback(id))));
  const [scoreSaved, setScoreSaved] = useState(() => scoreSavedParam === "1" || Boolean(queryClient.getQueryData(queryKeys.scoreSaveFeedback(id))));
  const session = useAuthenticatedQuery<ClassSessionResult>(queryKeys.session(id), `/api/sessions/${id}`);
  const attendance = useAuthenticatedQuery<SessionAttendanceResult>(
    queryKeys.attendance(id),
    `/api/sessions/${id}/attendance?classroomId=${encodeURIComponent(session.data?.classroomId ?? "")}`,
    Boolean(session.data?.classroomId),
  );
  const timeline = useAuthenticatedQuery<SessionTimelineEventResult[]>(queryKeys.timeline(id), `/api/sessions/${id}/timeline`);
  const refetchSession = session.refetch;

  useFocusEffect(useCallback(() => {
    if (queryClient.getQueryData(queryKeys.attendanceSaveFeedback(id))) setAttendanceSaved(true);
    if (scoreSavedParam === "1" || queryClient.getQueryData(queryKeys.scoreSaveFeedback(id))) setScoreSaved(true);
  }, [id, queryClient, scoreSavedParam]));

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 1_000);
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") setNow(Date.now()); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);

  useEffect(() => {
    if (session.data?.status !== "live") return;
    const delay = Math.max(0, new Date(session.data.scheduledEnd).getTime() - Date.now()) + 100;
    const timer = setTimeout(() => void refetchSession(), delay);
    return () => clearTimeout(timer);
  }, [refetchSession, session.data?.scheduledEnd, session.data?.status]);

  useEffect(() => {
    if (!attendanceSaved) return;
    queryClient.removeQueries({ queryKey: queryKeys.attendanceSaveFeedback(id), exact: true });
    const timer = setTimeout(() => setAttendanceSaved(false), 3_000);
    return () => clearTimeout(timer);
  }, [attendanceSaved, id, queryClient]);

  useEffect(() => {
    if (!scoreSaved && scoreSavedParam !== "1") return;
    queryClient.removeQueries({ queryKey: queryKeys.scoreSaveFeedback(id), exact: true });
    const timer = setTimeout(() => {
      setScoreSaved(false);
      if (scoreSavedParam === "1") router.setParams({ scoreSaved: undefined });
    }, 3_000);
    return () => clearTimeout(timer);
  }, [id, queryClient, scoreSaved, scoreSavedParam]);

  const end = useMutation({
    mutationFn: async () => {
      const completed = await apiRequest<ClassSessionResult>(`/api/sessions/${id}/end`, { method: "POST", token, body: { expectedUpdatedAt: session.data?.updatedAt } });
      if (completed.status !== "completed") throw new Error("Session completion was not confirmed by the server.");
      return completed;
    },
    onSuccess: async (completed) => {
      setConfirm(false);
      queryClient.setQueryData(queryKeys.session(id), completed);
      await invalidateSessionWorkflow(queryClient, id);
      router.replace(`/sessions/${id}/summary`);
    },
  });

  if (session.isLoading) return <LoadingSkeleton />;
  if (session.error || !session.data) return <SafeScreen><AppButton label="← กลับไปตารางสอน" tone="secondary" onPress={() => router.replace("/(tabs)/classes")} /><ErrorState error={session.error} onRetry={() => void session.refetch()} /></SafeScreen>;

  const data = session.data;
  const attendanceSummary = attendance.data ? summarizeAttendance(attendance.data) : null;
  const attendanceProgress = attendanceSummary ?? { enrolled: data.enrolledStudentCount, recorded: data.attendanceRecordedCount };
  const incomplete = attendanceProgress.recorded < attendanceProgress.enrolled;
  return <SafeScreen>
    <OfflineBanner visible={!isOnline} lastUpdated={session.dataUpdatedAt} />
    <Snackbar visible={attendanceSaved} message="บันทึกการเช็กชื่อเรียบร้อยแล้ว" />
    <Snackbar visible={scoreSaved || scoreSavedParam === "1"} message="บันทึกคะแนนเรียบร้อยแล้ว" />
    <AppButton label="← กลับไปตารางสอน" tone="secondary" onPress={() => router.replace("/(tabs)/classes")} />
    <AppHeader title={data.classroomName} subtitle={`${data.subjectName} · ${data.termName}`} />
    <View style={styles.row}>
      <StatusBadge label={data.status === "live" ? "LIVE · กำลังสอน" : data.status.toUpperCase()} tone={data.status === "live" ? "live" : data.status === "completed" ? "success" : data.status === "cancelled" ? "danger" : "neutral"} />
      {data.status === "live" ? <View style={styles.timers}><ThemedText accessibilityLabel={`เวลาที่สอน ${formatElapsed(data.startedAt ?? data.scheduledStart, now)}`} tone="primary" style={styles.timer}>{formatElapsed(data.startedAt ?? data.scheduledStart, now)}</ThemedText><ThemedText tone="muted" style={styles.remaining}>เหลือตามตาราง {formatRemaining(data.scheduledEnd, now)}</ThemedText></View> : null}
    </View>
    {attendance.isLoading ? <LoadingSkeleton /> : attendance.error || !attendanceSummary ? <ErrorState error={attendance.error} onRetry={() => void attendance.refetch()} /> : <AttendanceSummaryCard summary={attendanceSummary} />}
    <Card>
      {data.status === "live" ? <AppButton label={attendanceActionLabel(attendanceProgress, data.status)} accessibilityLabel={`${attendanceActionLabel(attendanceProgress, data.status)} บันทึกแล้ว ${attendanceProgress.recorded} จาก ${attendanceProgress.enrolled} คน`} onPress={() => router.push(`/sessions/${id}/attendance?classroomId=${data.classroomId}`)} /> : null}
      {data.status === "live" ? <AppButton label="คะแนนด่วน" tone="secondary" onPress={() => router.push(`/sessions/${id}/scores?teachingAssignmentId=${data.teachingAssignmentId}&classroomId=${data.classroomId}`)} /> : null}
    </Card>
    <Card>
      <ThemedText style={styles.heading}>ไทม์ไลน์คาบเรียน</ThemedText>
      {timeline.data?.length ? <Timeline>{timeline.data.map((event) => <TimelineItem key={event.id} title={event.eventType} description={new Intl.DateTimeFormat("th-TH", { timeStyle: "short" }).format(new Date(event.createdAt))} status="complete" />)}</Timeline> : <ThemedText tone="muted" style={styles.muted}>ยังไม่มีกิจกรรมเพิ่มเติม</ThemedText>}
    </Card>
    {data.status === "live" ? <AppButton label="จบคาบเรียน" tone="danger" disabled={!isOnline || end.isPending} accessibilityHint={!isOnline ? "ต้องเชื่อมต่ออินเทอร์เน็ตก่อนจบคาบ" : undefined} onPress={() => setConfirm(true)} /> : null}
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
