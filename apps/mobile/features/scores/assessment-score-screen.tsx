import type { GradebookResult } from "@classroom-os/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, Text, type TextInput, View } from "react-native";

import { StudentAvatar } from "@/components/student/student-avatar";
import { AppButton, AppHeader, Card, ErrorState, LoadingSkeleton, SafeScreen } from "@/components/ui/primitives";
import { spacing } from "@/constants/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { useTheme } from "@/features/theme/theme-context";
import { useAuthenticatedQuery } from "@/hooks/use-authenticated-query";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { apiRequest } from "@/lib/api-client";
import { thaiErrorMessage } from "@/lib/api-error";
import { queryKeys } from "@/lib/query-keys";

import { parseScoreInput } from "./score-input";
import { ScoreInputField } from "./score-input-field";

export function AssessmentScoreScreen({ teachingAssignmentId, assessmentId }: { teachingAssignmentId: string; assessmentId: string }) {
  const { token } = useAuth(); const { colors } = useTheme(); const { isOnline } = useNetworkStatus(); const queryClient = useQueryClient();
  const gradebook = useAuthenticatedQuery<GradebookResult>(queryKeys.gradebook(teachingAssignmentId), `/api/assessments?teachingAssignmentId=${encodeURIComponent(teachingAssignmentId)}`, Boolean(teachingAssignmentId));
  const [values, setValues] = useState<Record<string, string>>({}); const [dirty, setDirty] = useState<Set<string>>(new Set()); const inputs = useRef<Record<string, TextInput | null>>({});
  const assessment = gradebook.data?.assessments.find((item) => item.id === assessmentId) ?? null;
  const valueFor = (studentId: string) => studentId in values ? values[studentId] ?? "" : String(gradebook.data?.students.find((student) => student.studentId === studentId)?.scores.find((score) => score.assessmentId === assessmentId)?.value ?? "");
  const save = useMutation({ mutationFn: () => apiRequest(`/api/assessments/${assessmentId}/scores`, { method: "PUT", token, body: { classroomId: gradebook.data!.teachingContext.classroomId, scores: [...dirty].map((studentId) => { const parsed = parseScoreInput(valueFor(studentId), assessment!.maxScore); if (parsed.kind === "invalid") throw new Error(parsed.message); return { studentId, value: parsed.kind === "empty" ? null : parsed.value }; }) } }), onSuccess: async () => { setValues({}); setDirty(new Set()); await queryClient.invalidateQueries({ queryKey: queryKeys.gradebook(teachingAssignmentId) }); router.back(); } });
  if (gradebook.isLoading) return <LoadingSkeleton />;
  if (gradebook.error || !gradebook.data || !assessment) return <SafeScreen><ErrorState error={gradebook.error ?? new Error("ไม่พบรายการคะแนน")} onRetry={() => void gradebook.refetch()} /></SafeScreen>;
  const invalid = gradebook.data.students.some((student) => parseScoreInput(valueFor(student.studentId), assessment.maxScore).kind === "invalid");
  return <SafeScreen><AppButton label="← กลับไปรายการคะแนน" tone="secondary" onPress={() => router.back()} /><AppHeader title={assessment.title} subtitle={`${gradebook.data.teachingContext.classroomName} · เต็ม ${assessment.maxScore}`} />
    {gradebook.data.students.map((student, index) => { const parsed = parseScoreInput(valueFor(student.studentId), assessment.maxScore); const next = gradebook.data.students[index + 1]; return <Card key={student.studentId}><View style={styles.row}><StudentAvatar firstName={student.firstName} lastName={student.lastName} size={44} /><View style={styles.flex}><Text style={[styles.name, { color: colors.text }]}>{student.firstName} {student.lastName}</Text><Text style={{ color: colors.muted }}>{student.studentNumber}</Text></View><ScoreInputField accessibilityLabel={`คะแนนของ ${student.firstName} ${student.lastName}`} value={valueFor(student.studentId)} onChangeText={(value) => { setValues((current) => ({ ...current, [student.studentId]: value })); setDirty((current) => new Set(current).add(student.studentId)); }} inputRef={(input) => { inputs.current[student.studentId] = input; }} onSubmitEditing={() => next ? inputs.current[next.studentId]?.focus() : undefined} submitBehavior={next ? "submit" : "blurAndSubmit"} placeholder="—" style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} maxLength={7} /><Text style={{ color: colors.muted }}>/ {assessment.maxScore}</Text></View>{parsed.kind === "invalid" ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{parsed.message}</Text> : null}</Card>; })}
    <AppButton label={save.isPending ? "กำลังบันทึก…" : "บันทึกคะแนนดิบ"} onPress={() => save.mutate()} disabled={!isOnline || save.isPending || dirty.size === 0 || invalid} />{save.error ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{thaiErrorMessage(save.error)}</Text> : null}</SafeScreen>;
}
const styles = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center", gap: spacing.sm }, flex: { flex: 1 }, name: { fontSize: 16, fontWeight: "700" }, input: { minWidth: 64, minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: spacing.sm, fontSize: 18, textAlign: "right" } });
