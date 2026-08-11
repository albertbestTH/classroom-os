import type { AssessmentResult, ClassSessionResult, GradebookResult } from "@classroom-os/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, type TextInput, View } from "react-native";

import { StudentAvatar } from "@/components/student/student-avatar";
import { AppButton, AppHeader, Card, EmptyState, ErrorState, LoadingSkeleton, SafeScreen } from "@/components/ui/primitives";
import { spacing } from "@/constants/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { useTheme } from "@/features/theme/theme-context";
import { useAuthenticatedQuery } from "@/hooks/use-authenticated-query";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { apiRequest } from "@/lib/api-client";
import { thaiErrorMessage } from "@/lib/api-error";
import { invalidateScoreWorkflow, queryKeys } from "@/lib/query-keys";

import { parseScoreInput } from "./score-input";
import { ScoreInputField } from "./score-input-field";

type Props = { sessionId: string; teachingAssignmentId: string; classroomId: string };

export function QuickScoreScreen({ sessionId, teachingAssignmentId, classroomId }: Props) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();
  const { colors: themeColors } = useTheme();
  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const scoreInputs = useRef<Record<string, TextInput | null>>({});
  const saveRequested = useRef(false);

  const session = useAuthenticatedQuery<ClassSessionResult>(
    queryKeys.session(sessionId),
    `/api/sessions/${encodeURIComponent(sessionId)}`,
    Boolean(sessionId),
  );
  const gradebook = useAuthenticatedQuery<GradebookResult>(
    queryKeys.gradebook(teachingAssignmentId),
    `/api/assessments?teachingAssignmentId=${encodeURIComponent(teachingAssignmentId)}&classSessionId=${encodeURIComponent(sessionId)}`,
    Boolean(teachingAssignmentId),
  );
  const existingAssessment = gradebook.data?.assessments.find((item) => item.classSessionId === sessionId) ?? null;
  const readOnly = session.data?.status === "completed" || session.data?.status === "cancelled";

  const resolveAssessment = useMutation({
    mutationFn: () => apiRequest<AssessmentResult>("/api/assessments", {
      method: "POST",
      token,
      body: {
        teachingAssignmentId,
        classSessionId: sessionId,
        title: `คะแนนด่วน · ${gradebook.data?.teachingContext.subjectName ?? "คาบเรียน"}`,
        type: "participation",
        maxScore: 10,
        dueAt: null,
      },
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.gradebook(teachingAssignmentId) });
    },
  });

  useEffect(() => {
    if (!gradebook.data || existingAssessment || resolveAssessment.isPending || resolveAssessment.data || resolveAssessment.error || readOnly) return;
    resolveAssessment.mutate();
  }, [existingAssessment, gradebook.data, readOnly, resolveAssessment]);

  const assessment = existingAssessment ?? resolveAssessment.data ?? null;

  const scoreValue = (studentId: string) => {
    if (studentId in values) return values[studentId] ?? "";
    const score = gradebook.data?.students
      .find((student) => student.studentId === studentId)
      ?.scores.find((item) => item.assessmentId === assessment?.id);
    return score?.value === null || score?.value === undefined ? "" : String(score.value);
  };

  const save = useMutation({
    mutationFn: () => apiRequest(`/api/assessments/${assessment!.id}/scores`, {
      method: "PUT",
      token,
      body: {
        classroomId,
        scores: [...dirty].flatMap((studentId) => {
          const parsed = parseScoreInput(scoreValue(studentId), assessment!.maxScore);
          if (parsed.kind === "invalid") throw new Error(parsed.message);
          return parsed.kind === "empty" ? [] : [{ studentId, value: parsed.value }];
        }),
      },
    }),
    onSuccess: () => {
      saveRequested.current = false;
      setValues({});
      setDirty(new Set());
      queryClient.setQueryData(queryKeys.scoreSaveFeedback(sessionId), true);
      void invalidateScoreWorkflow(queryClient, teachingAssignmentId, sessionId);
      router.replace(`/sessions/${sessionId}?scoreSaved=1`);
    },
    onError: () => {
      saveRequested.current = false;
    },
  });

  const submitScores = () => {
    if (saveRequested.current || save.isPending) return;
    saveRequested.current = true;
    save.mutate();
  };

  if (session.isLoading || gradebook.isLoading) return <LoadingSkeleton />;
  if (session.error || !session.data) return <SafeScreen><AppButton label="← กลับไปตารางสอน" tone="secondary" onPress={() => router.back()} /><ErrorState error={session.error} onRetry={() => void session.refetch()} /></SafeScreen>;
  if (gradebook.error || !gradebook.data) return <SafeScreen><AppButton label="← กลับไปหน้าห้องเรียน" tone="secondary" onPress={() => router.back()} /><ErrorState error={gradebook.error} onRetry={() => void gradebook.refetch()} /></SafeScreen>;
  const resolving = !assessment && !readOnly && !resolveAssessment.error;
  if (resolving) return <LoadingSkeleton />;
  if (resolveAssessment.error) return <SafeScreen><AppButton label="← กลับไปหน้าห้องเรียน" tone="secondary" onPress={() => router.back()} /><ErrorState error={resolveAssessment.error} onRetry={() => { resolveAssessment.reset(); resolveAssessment.mutate(); }} /></SafeScreen>;

  const hasInvalidScore = assessment
    ? gradebook.data.students.some((student) => parseScoreInput(scoreValue(student.studentId), assessment.maxScore).kind === "invalid")
    : false;

  return <SafeScreen>
    <AppButton label="← กลับไปหน้าห้องเรียน" tone="secondary" onPress={() => router.replace(`/sessions/${sessionId}`)} />
    <AppHeader title="คะแนนด่วน" subtitle={`${gradebook.data.teachingContext.classroomName} · ${gradebook.data.teachingContext.subjectName}`} />
    {!assessment ? <EmptyState title="ยังไม่มีคะแนนสำหรับคาบนี้" description="คาบเรียนนี้ยังไม่มีข้อมูลคะแนน" /> : null}
    {assessment ? gradebook.data.students.map((student, index) => {
      const validation = parseScoreInput(scoreValue(student.studentId), assessment.maxScore);
      const nextStudent = gradebook.data.students[index + 1];
      return <Card key={student.studentId}>
        <View style={styles.studentRow}>
          <StudentAvatar firstName={student.firstName} lastName={student.lastName} size={48} />
          <View style={styles.flex}><Text style={[styles.name, { color: themeColors.text }]}>{student.firstName} {student.lastName}</Text><Text style={[styles.meta, { color: themeColors.muted }]}>{student.studentNumber}</Text></View>
          <ScoreInputField
            accessibilityLabel={`คะแนนของ ${student.firstName} ${student.lastName}`}
            value={scoreValue(student.studentId)}
            onChangeText={(value) => { setValues((current) => ({ ...current, [student.studentId]: value })); setDirty((current) => new Set(current).add(student.studentId)); }}
            inputRef={(input) => { scoreInputs.current[student.studentId] = input; }}
            onSubmitEditing={() => nextStudent ? scoreInputs.current[nextStudent.studentId]?.focus() : undefined}
            submitBehavior={nextStudent ? "submit" : "blurAndSubmit"}
            placeholder="—"
            style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
            maxLength={5}
          />
          <Text style={[styles.max, { color: themeColors.muted }]}>/ {assessment.maxScore}</Text>
        </View>
        {validation.kind === "invalid" ? <Text accessibilityRole="alert" style={[styles.error, { color: themeColors.danger }]}>{validation.message}</Text> : null}
      </Card>;
    }) : null}
    {assessment && !readOnly ? <AppButton label={save.isPending ? "กำลังบันทึก…" : "บันทึกคะแนน"} onPress={submitScores} disabled={!isOnline || save.isPending || dirty.size === 0 || hasInvalidScore} /> : null}
    {save.error ? <Text accessibilityRole="alert" style={[styles.error, { color: themeColors.danger }]}>{thaiErrorMessage(save.error)}</Text> : null}
  </SafeScreen>;
}

const styles = StyleSheet.create({
  studentRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  flex: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700" },
  meta: { marginTop: 2 },
  input: { minWidth: 64, minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: spacing.sm, fontSize: 18, textAlign: "right" },
  max: { minWidth: 32 },
  error: { lineHeight: 22 },
});
