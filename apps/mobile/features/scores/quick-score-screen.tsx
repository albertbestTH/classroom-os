import type { AssessmentResult, GradebookResult } from "@classroom-os/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { StudentAvatar } from "@/components/student/student-avatar";
import { AppButton, AppHeader, Card, EmptyState, ErrorState, LoadingSkeleton, SafeScreen } from "@/components/ui/primitives";
import { spacing } from "@/constants/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { useAuthenticatedQuery } from "@/hooks/use-authenticated-query";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useTheme } from "@/features/theme/theme-context";
import { apiRequest } from "@/lib/api-client";
import { thaiErrorMessage } from "@/lib/api-error";

type Props = { sessionId: string; teachingAssignmentId: string; classroomId: string };

export function QuickScoreScreen({ sessionId, teachingAssignmentId, classroomId }: Props) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();
  const { colors: themeColors } = useTheme();
  const gradebook = useAuthenticatedQuery<GradebookResult>(
    ["gradebook", teachingAssignmentId],
    `/api/assessments?teachingAssignmentId=${encodeURIComponent(teachingAssignmentId)}&classSessionId=${encodeURIComponent(sessionId)}`,
    Boolean(teachingAssignmentId),
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const assessment = gradebook.data?.assessments.find((item) => item.classSessionId === sessionId) ?? null;

  const scoreValue = (studentId: string) => {
    if (studentId in values) return values[studentId] ?? "";
    const score = gradebook.data?.students
      .find((student) => student.studentId === studentId)
      ?.scores.find((item) => item.assessmentId === assessment?.id);
    return score?.value === null || score?.value === undefined ? "" : String(score.value);
  };

  const create = useMutation({
    mutationFn: () => apiRequest<AssessmentResult>("/api/assessments", { method: "POST", token, body: {
      teachingAssignmentId,
      classSessionId: sessionId,
      title: "คะแนนการมีส่วนร่วมในคาบ",
      type: "participation",
      maxScore: 10,
      dueAt: null,
    } }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["gradebook", teachingAssignmentId] }),
  });
  const save = useMutation({
    mutationFn: () => apiRequest(`/api/assessments/${assessment!.id}/scores`, { method: "PUT", token, body: {
      classroomId,
      scores: gradebook.data!.students.flatMap((student) => {
        const raw = scoreValue(student.studentId).trim();
        return raw === "" ? [] : [{ studentId: student.studentId, value: Number(raw) }];
      }),
    } }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["gradebook", teachingAssignmentId] }),
  });

  if (gradebook.isLoading) return <LoadingSkeleton />;
  if (gradebook.error || !gradebook.data) return <SafeScreen><AppButton label="← กลับไปหน้าห้องเรียน" tone="secondary" onPress={() => router.back()} /><ErrorState message={thaiErrorMessage(gradebook.error)} onRetry={() => void gradebook.refetch()} /></SafeScreen>;

  return <SafeScreen>
    <AppButton label="← กลับไปหน้าห้องเรียน" tone="secondary" onPress={() => router.back()} />
    <AppHeader title="คะแนนด่วน" subtitle={`${gradebook.data.teachingContext.classroomName} · ${gradebook.data.teachingContext.subjectName}`} />
    {!assessment ? <EmptyState title="ยังไม่มีงานคะแนนในคาบนี้" description="สร้างงานการมีส่วนร่วมเต็ม 10 คะแนน แล้วบันทึกเฉพาะนักเรียนที่ต้องการได้ทันที" /> : null}
    {!assessment ? <AppButton label={create.isPending ? "กำลังสร้าง…" : "สร้างคะแนนการมีส่วนร่วม"} onPress={() => create.mutate()} disabled={!isOnline || create.isPending} /> : null}
    {create.error ? <Text accessibilityRole="alert" style={[styles.error, { color: themeColors.danger }]}>{thaiErrorMessage(create.error)}</Text> : null}
    {assessment ? gradebook.data.students.map((student) => <Card key={student.studentId}>
      <View style={styles.studentRow}>
        <StudentAvatar firstName={student.firstName} lastName={student.lastName} size={48} />
        <View style={styles.flex}><Text style={[styles.name, { color: themeColors.text }]}>{student.firstName} {student.lastName}</Text><Text style={[styles.meta, { color: themeColors.muted }]}>{student.studentNumber}</Text></View>
        <TextInput
          accessibilityLabel={`คะแนนของ ${student.firstName} ${student.lastName}`}
          keyboardType="decimal-pad"
          value={scoreValue(student.studentId)}
          onChangeText={(value) => setValues((current) => ({ ...current, [student.studentId]: value }))}
          placeholder="—"
          style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
          maxLength={5}
        />
        <Text style={[styles.max, { color: themeColors.muted }]}>/ {assessment.maxScore}</Text>
      </View>
    </Card>) : null}
    {assessment ? <AppButton label={save.isPending ? "กำลังบันทึก…" : "บันทึกคะแนน"} onPress={() => save.mutate()} disabled={!isOnline || save.isPending} /> : null}
    {save.error ? <Text accessibilityRole="alert" style={[styles.error, { color: themeColors.danger }]}>{thaiErrorMessage(save.error)}</Text> : null}
  </SafeScreen>;
}

const styles = StyleSheet.create({
  studentRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  flex: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700" }, meta: { marginTop: 2 }, input: { minWidth: 64, minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: spacing.sm, fontSize: 18, textAlign: "right" }, max: { minWidth: 32 }, error: {},
});
