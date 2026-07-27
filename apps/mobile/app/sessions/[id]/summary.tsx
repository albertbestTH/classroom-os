import type { ClassSessionResult, SessionAttendanceResult } from "@classroom-os/types";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { AttendanceSummaryCard } from "@/components/classroom/attendance-summary-card";
import { AppButton, AppHeader, Card, ErrorState, LoadingSkeleton, ProgressBar, SafeScreen, StatusBadge } from "@/components/ui/primitives";
import { summarizeAttendance } from "@/features/attendance/attendance-summary";
import { useAuthenticatedQuery } from "@/hooks/use-authenticated-query";
import { useTheme } from "@/features/theme/theme-context";
import { thaiErrorMessage } from "@/lib/api-error";
import { queryKeys } from "@/lib/query-keys";

export default function SummaryScreen() {
  const { colors: themeColors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useAuthenticatedQuery<ClassSessionResult>(queryKeys.session(id), `/api/sessions/${id}`);
  const attendance = useAuthenticatedQuery<SessionAttendanceResult>(
    queryKeys.attendance(id),
    `/api/sessions/${id}/attendance?classroomId=${session.data?.classroomId ?? ""}`,
    Boolean(session.data),
  );

  if (session.isLoading || (session.data && attendance.isLoading)) return <LoadingSkeleton />;
  if (!session.data || session.error) return <SafeScreen><ErrorState message={thaiErrorMessage(session.error)} /></SafeScreen>;
  if (!attendance.data || attendance.error) return <SafeScreen><ErrorState message={thaiErrorMessage(attendance.error)} onRetry={() => void attendance.refetch()} /></SafeScreen>;

  const totals = summarizeAttendance(attendance.data);
  const enrolled = totals.enrolled;
  const recorded = totals.recorded;
  const attending = totals.present + totals.late;
  const attendanceRate = enrolled > 0 ? Math.round((attending / enrolled) * 100) : 0;
  const needsFollowUp = totals.absent + totals.leave;

  return <SafeScreen>
    <AppHeader title="สรุปคาบเรียน" subtitle={`${session.data.classroomName} · ${session.data.subjectName}`} />
    <StatusBadge label={session.data.status === "cancelled" ? "ยกเลิกแล้ว" : "เสร็จสิ้น"} tone={session.data.status === "cancelled" ? "danger" : "success"} />
    {session.data.cancellationReason ? <Card><Text>{session.data.cancellationReason}</Text></Card> : null}

    <Card>
      <Text style={[styles.heroLabel, { color: themeColors.muted }]}>อัตราเข้าเรียน</Text>
      <Text accessibilityLabel={`อัตราเข้าเรียน ${attendanceRate} เปอร์เซ็นต์`} style={[styles.heroValue, { color: themeColors.primaryDark }]}>{attendanceRate}%</Text>
      <Text style={[styles.heroCaption, { color: themeColors.text }]}>มาเรียนและมาสาย {attending} จาก {enrolled} คน</Text>
      <ProgressBar label="บันทึกการเช็กชื่อ" value={recorded} max={enrolled} tone={recorded >= enrolled ? "success" : "warning"} />
    </Card>

    <AttendanceSummaryCard summary={totals} />
    <Card>
      <ProgressBar label="มาเรียนและมาสาย" value={attending} max={enrolled} tone="success" />
      {needsFollowUp > 0 ? <Text style={[styles.followUp, { color: themeColors.warning }]}>ควรติดตามนักเรียนที่ขาดหรือลา {needsFollowUp} คน</Text> : <Text style={[styles.complete, { color: themeColors.success }]}>นักเรียนทุกคนมาเรียนหรือมาสาย</Text>}
    </Card>

    <AppButton label="กลับไปหน้าวันนี้" onPress={() => router.replace("/(tabs)")} />
    <AppButton label="ไปตารางสอน" tone="secondary" onPress={() => router.replace("/(tabs)/classes")} />
  </SafeScreen>;
}

const styles = StyleSheet.create({
  heroLabel: { fontSize: 16, fontWeight: "700" }, heroValue: { fontSize: 48, fontWeight: "900", lineHeight: 56 }, heroCaption: { fontSize: 16, lineHeight: 24 },
  followUp: { fontSize: 15, fontWeight: "700", lineHeight: 22 }, complete: { fontSize: 15, fontWeight: "700", lineHeight: 22 },
});
