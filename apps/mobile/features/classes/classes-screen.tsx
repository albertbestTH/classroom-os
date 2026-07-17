import type { ClassroomResult, TeachingAssignmentResult, TimetableEntryResult } from "@classroom-os/types";
import { useQueries } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AppButton, AppHeader, Card, EmptyState, ErrorState, LoadingSkeleton, SafeScreen, StatusBadge } from "@/components/ui/primitives";
import { colors, spacing } from "@/constants/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { apiRequest } from "@/lib/api-client";
import { thaiErrorMessage } from "@/lib/api-error";

const weekday = ["", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];
export function ClassesScreen() {
  const { token } = useAuth();
  const [assignments, timetable, classrooms] = useQueries({ queries: [
    { queryKey: ["assignments"], queryFn: () => apiRequest<TeachingAssignmentResult[]>("/api/teaching-assignments", { token }) },
    { queryKey: ["timetable"], queryFn: () => apiRequest<TimetableEntryResult[]>("/api/timetable", { token }) },
    { queryKey: ["classrooms"], queryFn: () => apiRequest<ClassroomResult[]>("/api/classrooms", { token }) },
  ] });
  if (assignments.isLoading || timetable.isLoading || classrooms.isLoading) return <LoadingSkeleton />;
  const error = assignments.error ?? timetable.error ?? classrooms.error;
  if (error) return <SafeScreen><ErrorState message={thaiErrorMessage(error)} onRetry={() => { void assignments.refetch(); void timetable.refetch(); void classrooms.refetch(); }} /></SafeScreen>;
  const items = assignments.data ?? [];
  return <SafeScreen><AppHeader title="ชั้นเรียนของฉัน" subtitle="แยกตามงานสอน ห้องเรียน และรายวิชา" />{items.length ? items.map((assignment) => {
    const slots = (timetable.data ?? []).filter((entry) => entry.teachingAssignmentId === assignment.id);
    const classroom = (classrooms.data ?? []).find((item) => item.id === assignment.classroomId);
    const schedule = slots.length ? slots.map((entry) => `${weekday[entry.weekday]} ${entry.startTime.slice(11, 16)}`).join(" · ") : "ยังไม่มีตารางประจำสัปดาห์";
    return <Card key={assignment.id}><View style={styles.row}><View style={styles.flex}><Text style={styles.classroom}>{assignment.classroomName}</Text><Text style={styles.subject}>{assignment.subjectName}</Text></View><StatusBadge label="กำลังสอน" tone="success" /></View><Text style={styles.term}>{assignment.academicYearName} · {assignment.termName}</Text><Text style={styles.schedule}>{schedule}</Text><Text style={styles.count}>นักเรียนที่ใช้งาน {classroom?.studentCount ?? 0} คน</Text><AppButton label="ดูรายละเอียด" tone="secondary" onPress={() => router.push(`/classes/${assignment.id}`)} /></Card>;
  }) : <EmptyState title="ยังไม่มีชั้นเรียนที่ได้รับมอบหมาย" description="ติดต่อผู้ดูแลโรงเรียนเพื่อเพิ่มงานสอน" />}</SafeScreen>;
}
const styles = StyleSheet.create({ row: { flexDirection: "row", gap: spacing.md }, flex: { flex: 1 }, classroom: { color: colors.text, fontSize: 19, fontWeight: "800" }, subject: { color: colors.primaryDark, fontSize: 16, fontWeight: "700", marginTop: 4 }, term: { color: colors.muted }, schedule: { color: colors.text, lineHeight: 22 }, count: { color: colors.muted } });
