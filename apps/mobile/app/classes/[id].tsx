import type { TeachingAssignmentResult, TimetableEntryResult } from "@classroom-os/types";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";

import { AppButton, AppHeader, Card, ErrorState, LoadingSkeleton, SafeScreen } from "@/components/ui/primitives";
import { useAuthenticatedQuery } from "@/hooks/use-authenticated-query";
import { thaiErrorMessage } from "@/lib/api-error";

const weekday = ["", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];

export default function ClassDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const assignments = useAuthenticatedQuery<TeachingAssignmentResult[]>(["assignments"], "/api/teaching-assignments");
  const timetable = useAuthenticatedQuery<TimetableEntryResult[]>(["timetable"], "/api/timetable");
  if (assignments.isLoading || timetable.isLoading) return <LoadingSkeleton />;
  const assignment = assignments.data?.find((item) => item.id === id);
  if (assignments.error || timetable.error || !assignment) return <SafeScreen><AppButton label="← กลับไปตารางสอน" tone="secondary" onPress={() => router.replace("/(tabs)/classes")} /><ErrorState message={assignment ? thaiErrorMessage(assignments.error ?? timetable.error) : "ไม่พบชั้นเรียนนี้ในงานสอนของคุณ"} /></SafeScreen>;
  const slots = timetable.data?.filter((item) => item.teachingAssignmentId === id) ?? [];

  return <SafeScreen>
    <AppButton label="← กลับไปตารางสอน" tone="secondary" onPress={() => router.replace("/(tabs)/classes")} />
    <AppHeader title={assignment.classroomName} subtitle={`${assignment.subjectName} · ${assignment.termName}`} />
    <Card>
      <Text>ปีการศึกษา {assignment.academicYearName}</Text>
      <Text>ตารางประจำสัปดาห์ {slots.length} คาบ</Text>
      {slots.map((slot) => <Text key={slot.id}>{weekday[slot.weekday]} · {slot.startTime.slice(11, 16)}–{slot.endTime.slice(11, 16)} น.{slot.room ? ` · ห้อง ${slot.room}` : ""}</Text>)}
    </Card>
  </SafeScreen>;
}
