import type { AttendanceStatus, SessionAttendanceResult } from "@classroom-os/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { StudentAvatar } from "@/components/student/student-avatar";
import { AppButton, AppHeader, AttendanceChip, Card, ConfirmationModal, ErrorState, LoadingSkeleton, OfflineBanner, SafeScreen, SearchBar, Snackbar, StatusBadge } from "@/components/ui/primitives";
import { colors, spacing } from "@/constants/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { useAuthenticatedQuery } from "@/hooks/use-authenticated-query";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { apiRequest } from "@/lib/api-client";
import { thaiErrorMessage } from "@/lib/api-error";
import { matchesSearch } from "@/lib/search";

import { buildAttendanceBatch } from "./build-attendance-batch";

const statusOptions: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "มา" },
  { value: "late", label: "สาย" },
  { value: "absent", label: "ขาด" },
  { value: "leave", label: "ลา" },
];
const memoryDrafts = new Map<string, Record<string, AttendanceStatus>>();

export function AttendanceScreen({ sessionId, classroomId }: { sessionId: string; classroomId: string }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();
  const [search, setSearch] = useState("");
  const [discardOpen, setDiscardOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const roster = useAuthenticatedQuery<SessionAttendanceResult>(["attendance", sessionId], `/api/sessions/${sessionId}/attendance?classroomId=${encodeURIComponent(classroomId)}`);
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>(() => memoryDrafts.get(sessionId) ?? {});
  const changed = useMemo(() => roster.data?.students.filter((student) => draft[student.studentId] && draft[student.studentId] !== student.status).length ?? 0, [draft, roster.data]);
  const filtered = roster.data?.students.filter((student) => matchesSearch(search, [student.studentNumber, student.firstName, student.lastName])) ?? [];

  const setStatus = (studentId: string, status: AttendanceStatus) => setDraft((current) => {
    const next = { ...current, [studentId]: status };
    memoryDrafts.set(sessionId, next);
    setSaved(false);
    return next;
  });
  const save = useMutation({
    mutationFn: () => apiRequest<SessionAttendanceResult>(`/api/sessions/${sessionId}/attendance`, { method: "PUT", token, body: { classroomId, records: buildAttendanceBatch(roster.data!.students, draft) } }),
    onSuccess: async () => {
      memoryDrafts.delete(sessionId);
      setDraft({});
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: ["attendance", sessionId] });
      await queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
    },
  });

  if (roster.isLoading) return <LoadingSkeleton />;
  if (roster.error || !roster.data) return <SafeScreen><ErrorState message={thaiErrorMessage(roster.error)} onRetry={() => void roster.refetch()} /></SafeScreen>;
  const readOnly = roster.data.status !== "live";
  const returnToSession = () => router.replace(`/sessions/${sessionId}`);

  return <SafeScreen>
    <OfflineBanner visible={!isOnline} lastUpdated={roster.dataUpdatedAt} />
    <AppButton label="← กลับไปหน้าห้องเรียน" tone="secondary" onPress={() => { if (changed > 0) setExitOpen(true); else returnToSession(); }} />
    <AppHeader title="เช็กชื่อ" subtitle={`บันทึกแล้ว ${roster.data.recordedCount}/${roster.data.enrolledCount} คน`} />
    {readOnly ? <StatusBadge label="คาบนี้อ่านอย่างเดียว" tone="warning" /> : null}
    <SearchBar accessibilityLabel="ค้นหานักเรียน" placeholder="ค้นหาชื่อหรือรหัสนักเรียน" value={search} onChangeText={setSearch} />
    {!readOnly ? <AppButton label="มาครบทุกคน" tone="secondary" onPress={() => {
      const next = Object.fromEntries(roster.data!.students.map((student) => [student.studentId, "present"])) as Record<string, AttendanceStatus>;
      memoryDrafts.set(sessionId, next);
      setDraft(next);
      setSaved(false);
    }} /> : null}
    {filtered.map((student) => {
      const current = draft[student.studentId] ?? student.status;
      return <Card key={student.studentId}>
        <View style={styles.identity}>
          <StudentAvatar firstName={student.firstName} lastName={student.lastName} />
          <View style={styles.identityText}><Text style={styles.name}>{student.firstName} {student.lastName}</Text><Text style={styles.code}>{student.studentNumber}</Text></View>
        </View>
        <View accessibilityRole="radiogroup" style={styles.controls}>{statusOptions.map((option) => <AttendanceChip key={option.value} label={option.label} accessibilityLabel={`${student.firstName} ${option.label}`} selected={current === option.value} disabled={readOnly} onPress={() => setStatus(student.studentId, option.value)} />)}</View>
        {student.corrections.length ? <Text style={styles.correction}>แก้ไขย้อนหลัง {student.corrections.length} ครั้ง</Text> : null}
      </Card>;
    })}
    {!readOnly ? <View style={styles.save}>
      <Text style={styles.pending}>รายการที่เปลี่ยน {changed} คน</Text>
      <AppButton label={save.isPending ? "กำลังบันทึก…" : "บันทึกการเช็กชื่อ"} disabled={!isOnline || save.isPending || changed === 0} accessibilityHint={!isOnline ? "ต้องเชื่อมต่ออินเทอร์เน็ตก่อนบันทึก" : undefined} onPress={() => save.mutate()} />
      {changed ? <AppButton label="ยกเลิกการเปลี่ยนแปลง" tone="secondary" onPress={() => setDiscardOpen(true)} /> : null}
    </View> : null}
    <Snackbar visible={saved} message="บันทึกการเช็กชื่อเรียบร้อยแล้ว" />
    {save.error ? <ErrorState message={`${thaiErrorMessage(save.error)} หากข้อมูลเปลี่ยนจากอุปกรณ์อื่น กรุณาโหลดใหม่`} onRetry={() => save.mutate()} /> : null}
    <ConfirmationModal visible={discardOpen} title="ทิ้งการเปลี่ยนแปลง?" description={`มี ${changed} รายการที่ยังไม่บันทึก`} confirmLabel="ทิ้งการเปลี่ยนแปลง" destructive onConfirm={() => { memoryDrafts.delete(sessionId); setDraft({}); setDiscardOpen(false); }} onCancel={() => setDiscardOpen(false)} />
    <ConfirmationModal visible={exitOpen} title="กลับไปหน้าห้องเรียน?" description={`มี ${changed} รายการที่ยังไม่บันทึก การกลับตอนนี้จะทิ้งการเปลี่ยนแปลงเหล่านี้`} confirmLabel="ทิ้งและกลับ" destructive onConfirm={() => { memoryDrafts.delete(sessionId); setDraft({}); setExitOpen(false); returnToSession(); }} onCancel={() => setExitOpen(false)} />
  </SafeScreen>;
}

const styles = StyleSheet.create({
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  identityText: { flex: 1 },
  name: { color: colors.text, fontSize: 17, fontWeight: "700" },
  code: { color: colors.muted, marginTop: 3 },
  controls: { flexDirection: "row", gap: spacing.sm },
  correction: { color: colors.muted, fontSize: 13 },
  save: { gap: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border, paddingTop: spacing.lg },
  pending: { color: colors.text, fontWeight: "700" },
});
