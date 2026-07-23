import type { AttendanceStatus, SessionAttendanceResult, SessionAttendanceStudentResult } from "@classroom-os/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { memo, useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StudentAvatar } from "@/components/student/student-avatar";
import { AppButton, AppHeader, AttendanceChip, BottomSheet, Card, ConfirmationSheet, EmptyState, ErrorState, LoadingSkeleton, OfflineBanner, SearchBar, Snackbar, StatusBadge, ThemedText } from "@/components/ui/primitives";
import { spacing } from "@/constants/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { useTheme } from "@/features/theme/theme-context";
import { useAuthenticatedQuery } from "@/hooks/use-authenticated-query";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { apiRequest } from "@/lib/api-client";
import { matchesSearch } from "@/lib/search";

import { buildAttendanceBatch } from "./build-attendance-batch";

const statusOptions: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "มา" }, { value: "late", label: "สาย" }, { value: "absent", label: "ขาด" }, { value: "leave", label: "ลา" },
];
const memoryDrafts = new Map<string, Record<string, AttendanceStatus>>();

type RowProps = { student: SessionAttendanceStudentResult; current: AttendanceStatus | null; readOnly: boolean; onStatus(studentId: string, status: AttendanceStatus): void; onPicker(studentId: string): void };
const StudentAttendanceRow = memo(function StudentAttendanceRow({ student, current, readOnly, onStatus, onPicker }: RowProps) {
  return <Card>
    <Pressable accessibilityRole="button" accessibilityLabel={`${student.firstName} ${student.lastName} ${student.studentNumber}`} accessibilityHint={readOnly ? "ดูสถานะการเข้าเรียน" : "กดค้างเพื่อเลือกสถานะ"} disabled={readOnly} onLongPress={() => onPicker(student.studentId)} style={styles.identity}>
      <StudentAvatar firstName={student.firstName} lastName={student.lastName} />
      <View style={styles.identityText}><ThemedText style={styles.name}>{student.firstName} {student.lastName}</ThemedText><ThemedText tone="muted">{student.studentNumber}</ThemedText></View>
    </Pressable>
    <View accessibilityRole="radiogroup" style={styles.controls}>{statusOptions.map((option) => <AttendanceChip key={option.value} label={option.label} accessibilityLabel={`${student.firstName} ${option.label}`} selected={current === option.value} disabled={readOnly} onPress={() => onStatus(student.studentId, option.value)} onLongPress={() => onPicker(student.studentId)} />)}</View>
    {student.corrections.length ? <ThemedText tone="muted" style={styles.correction}>แก้ไขย้อนหลัง {student.corrections.length} ครั้ง</ThemedText> : null}
  </Card>;
});

export function AttendanceScreen({ sessionId, classroomId }: { sessionId: string; classroomId: string }) {
  const { token } = useAuth(); const queryClient = useQueryClient(); const { colors } = useTheme(); const { isOnline } = useNetworkStatus();
  const [search, setSearch] = useState(""); const [discardOpen, setDiscardOpen] = useState(false); const [exitOpen, setExitOpen] = useState(false); const [saved, setSaved] = useState(false); const [pickerStudentId, setPickerStudentId] = useState<string | null>(null);
  const roster = useAuthenticatedQuery<SessionAttendanceResult>(["attendance", sessionId], `/api/sessions/${sessionId}/attendance?classroomId=${encodeURIComponent(classroomId)}`);
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>(() => memoryDrafts.get(sessionId) ?? {});
  const changed = useMemo(() => roster.data?.students.filter((student) => draft[student.studentId] && draft[student.studentId] !== student.status).length ?? 0, [draft, roster.data]);
  const filtered = useMemo(() => roster.data?.students.filter((student) => matchesSearch(search, [student.studentNumber, student.firstName, student.lastName])) ?? [], [roster.data?.students, search]);
  const setStatus = useCallback((studentId: string, status: AttendanceStatus) => setDraft((current) => { const next = { ...current, [studentId]: status }; memoryDrafts.set(sessionId, next); setSaved(false); return next; }), [sessionId]);
  const save = useMutation({ mutationFn: () => apiRequest<SessionAttendanceResult>(`/api/sessions/${sessionId}/attendance`, { method: "PUT", token, body: { classroomId, records: buildAttendanceBatch(roster.data!.students, draft) } }), onSuccess: async () => { memoryDrafts.delete(sessionId); setDraft({}); setSaved(true); await queryClient.invalidateQueries({ queryKey: ["attendance", sessionId] }); await queryClient.invalidateQueries({ queryKey: ["session", sessionId] }); } });

  if (roster.isLoading) return <LoadingSkeleton />;
  if (roster.error || !roster.data) return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}><ErrorState error={roster.error} onRetry={() => void roster.refetch()} /></SafeAreaView>;
  const data = roster.data; const readOnly = data.status !== "live"; const pickerStudent = data.students.find((student) => student.studentId === pickerStudentId); const returnToSession = () => router.replace(`/sessions/${sessionId}`);

  const header = <View style={styles.header}>
    <OfflineBanner visible={!isOnline} lastUpdated={roster.dataUpdatedAt} />
    <AppButton label="← กลับไปหน้าห้องเรียน" tone="secondary" onPress={() => { if (changed > 0) setExitOpen(true); else returnToSession(); }} />
    <AppHeader title="เช็กชื่อ" subtitle={`บันทึกแล้ว ${data.recordedCount}/${data.enrolledCount} คน`} />
    {readOnly ? <StatusBadge label="คาบนี้อ่านอย่างเดียว" tone="warning" /> : null}
    <SearchBar accessibilityLabel="ค้นหานักเรียน" placeholder="ค้นหาชื่อหรือรหัสนักเรียน" value={search} onChangeText={setSearch} />
    {!readOnly ? <AppButton label="มาครบทุกคน" tone="secondary" onPress={() => { const next = Object.fromEntries(data.students.map((student) => [student.studentId, "present"])) as Record<string, AttendanceStatus>; memoryDrafts.set(sessionId, next); setDraft(next); setSaved(false); }} /> : null}
  </View>;
  const footer = !readOnly ? <View style={[styles.save, { backgroundColor: colors.surface, borderColor: colors.border }]}><ThemedText style={styles.pending}>รายการที่เปลี่ยน {changed} คน</ThemedText><AppButton label={save.isPending ? "กำลังบันทึก…" : "บันทึกการเช็กชื่อ"} disabled={!isOnline || save.isPending || changed === 0} accessibilityHint={!isOnline ? "ต้องเชื่อมต่ออินเทอร์เน็ตก่อนบันทึก" : undefined} onPress={() => save.mutate()} />{changed ? <AppButton label="ยกเลิกการเปลี่ยนแปลง" tone="secondary" onPress={() => setDiscardOpen(true)} /> : null}{save.error ? <ErrorState error={save.error} onRetry={isOnline ? () => save.mutate() : undefined} /> : null}</View> : null;

  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
    <FlatList data={filtered} keyExtractor={(student) => student.studentId} renderItem={({ item }) => <StudentAttendanceRow student={item} current={draft[item.studentId] ?? item.status} readOnly={readOnly} onStatus={setStatus} onPicker={setPickerStudentId} />} ListHeaderComponent={header} ListFooterComponent={footer} ListEmptyComponent={<EmptyState title="ไม่พบนักเรียน" description="ลองค้นหาด้วยชื่อหรือรหัสนักเรียนอีกครั้ง" />} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" initialNumToRender={12} maxToRenderPerBatch={10} windowSize={7} removeClippedSubviews />
    <Snackbar visible={saved} message="บันทึกการเช็กชื่อเรียบร้อยแล้ว" />
    <BottomSheet visible={Boolean(pickerStudent)} onClose={() => setPickerStudentId(null)}><AppHeader title={pickerStudent ? `${pickerStudent.firstName} ${pickerStudent.lastName}` : "เลือกสถานะ"} subtitle="เลือกสถานะการเข้าเรียน" />{pickerStudent ? statusOptions.map((option) => <AppButton key={option.value} label={option.label} tone={(draft[pickerStudent.studentId] ?? pickerStudent.status) === option.value ? "primary" : "secondary"} onPress={() => { setStatus(pickerStudent.studentId, option.value); setPickerStudentId(null); }} />) : null}</BottomSheet>
    <ConfirmationSheet visible={discardOpen} title="ทิ้งการเปลี่ยนแปลง?" description={`มี ${changed} รายการที่ยังไม่บันทึก`} confirmLabel="ทิ้งการเปลี่ยนแปลง" destructive onConfirm={() => { memoryDrafts.delete(sessionId); setDraft({}); setDiscardOpen(false); }} onCancel={() => setDiscardOpen(false)} />
    <ConfirmationSheet visible={exitOpen} title="กลับไปหน้าห้องเรียน?" description={`มี ${changed} รายการที่ยังไม่บันทึก การกลับตอนนี้จะทิ้งการเปลี่ยนแปลงเหล่านี้`} confirmLabel="ทิ้งและกลับ" destructive onConfirm={() => { memoryDrafts.delete(sessionId); setDraft({}); setExitOpen(false); returnToSession(); }} onCancel={() => setExitOpen(false)} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl }, header: { gap: spacing.lg, marginBottom: spacing.sm }, identity: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 48 }, identityText: { flex: 1 }, name: { fontSize: 17, fontWeight: "700" }, controls: { flexDirection: "row", gap: spacing.sm }, correction: { fontSize: 13 }, save: { gap: spacing.md, borderTopWidth: 1, paddingTop: spacing.lg, marginTop: spacing.md }, pending: { fontWeight: "700" } });
