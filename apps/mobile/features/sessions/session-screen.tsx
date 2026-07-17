import type { ClassSessionResult, SessionTimelineEventResult } from "@classroom-os/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";

import { AppButton, AppHeader, Card, ConfirmationModal, ErrorState, LoadingSkeleton, SafeScreen, StatusBadge } from "@/components/ui/primitives";
import { colors, spacing } from "@/constants/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { useAuthenticatedQuery } from "@/hooks/use-authenticated-query";
import { apiRequest } from "@/lib/api-client";
import { thaiErrorMessage } from "@/lib/api-error";

function elapsed(startedAt: string | null, now: number) { if (!startedAt) return "00:00"; const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000)); return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; }
export function SessionScreen({ id }: { id: string }) {
  const { token } = useAuth(); const queryClient = useQueryClient(); const [confirm, setConfirm] = useState(false); const [now, setNow] = useState(0);
  const session = useAuthenticatedQuery<ClassSessionResult>(["session", id], `/api/sessions/${id}`);
  const timeline = useAuthenticatedQuery<SessionTimelineEventResult[]>(["timeline", id], `/api/sessions/${id}/timeline`);
  useEffect(() => { const initial = setTimeout(() => setNow(Date.now()), 0); const timer = setInterval(() => setNow(Date.now()), 1_000); const subscription = AppState.addEventListener("change", (state) => { if (state === "active") setNow(Date.now()); }); return () => { clearTimeout(initial); clearInterval(timer); subscription.remove(); }; }, []);
  const end = useMutation({ mutationFn: () => apiRequest<ClassSessionResult>(`/api/sessions/${id}/end`, { method: "POST", token, body: { expectedUpdatedAt: session.data?.updatedAt } }), onSuccess: async () => { setConfirm(false); await queryClient.invalidateQueries({ queryKey: ["today"] }); router.replace(`/sessions/${id}/summary`); } });
  if (session.isLoading) return <LoadingSkeleton />;
  if (session.error || !session.data) return <SafeScreen><ErrorState message={thaiErrorMessage(session.error)} onRetry={() => void session.refetch()} /></SafeScreen>;
  const data = session.data; const incomplete = data.attendanceRecordedCount < data.enrolledStudentCount;
  return <SafeScreen><AppHeader title={data.classroomName} subtitle={`${data.subjectName} · ${data.termName}`} /><View style={styles.row}><StatusBadge label={data.status === "live" ? "LIVE · กำลังสอน" : data.status.toUpperCase()} tone={data.status === "live" ? "live" : data.status === "completed" ? "success" : data.status === "cancelled" ? "danger" : "neutral"} />{data.status === "live" ? <Text accessibilityLabel={`เวลาที่สอน ${elapsed(data.startedAt, now)}`} style={styles.timer}>{elapsed(data.startedAt, now)}</Text> : null}</View><Card><Text style={styles.heading}>การเช็กชื่อ</Text><Text style={styles.muted}>บันทึกแล้ว {data.attendanceRecordedCount}/{data.enrolledStudentCount} คน</Text>{data.status === "live" ? <AppButton label="เช็กชื่อ" onPress={() => router.push(`/sessions/${id}/attendance?classroomId=${data.classroomId}`)} /> : null}</Card><Card><Text style={styles.heading}>ไทม์ไลน์คาบเรียน</Text>{timeline.data?.length ? timeline.data.map((event) => <Text key={event.id} style={styles.muted}>• {event.eventType} · {new Intl.DateTimeFormat("th-TH", { timeStyle: "short" }).format(new Date(event.createdAt))}</Text>) : <Text style={styles.muted}>ยังไม่มีกิจกรรมเพิ่มเติม</Text>}</Card>{data.status === "live" ? <AppButton label="จบคาบเรียน" tone="danger" onPress={() => setConfirm(true)} /> : null}{end.error ? <Text accessibilityRole="alert" style={styles.error}>{thaiErrorMessage(end.error)} กรุณาโหลดสถานะใหม่</Text> : null}<ConfirmationModal visible={confirm} title="ยืนยันจบคาบ" description={`${data.classroomName} · ${data.subjectName}${incomplete ? "\nยังเช็กชื่อไม่ครบ กรุณาตรวจสอบก่อนยืนยัน" : ""}`} confirmLabel={end.isPending ? "กำลังจบคาบ…" : "ยืนยันจบคาบ"} destructive onConfirm={() => { if (!end.isPending) end.mutate(); }} onCancel={() => setConfirm(false)} /></SafeScreen>;
}
const styles = StyleSheet.create({ row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md }, timer: { color: colors.primaryDark, fontSize: 24, fontWeight: "800", fontVariant: ["tabular-nums"] }, heading: { color: colors.text, fontSize: 18, fontWeight: "700" }, muted: { color: colors.muted, lineHeight: 22 }, error: { color: colors.danger } });
