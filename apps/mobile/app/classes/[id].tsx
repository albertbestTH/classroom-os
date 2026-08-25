import type { TeachingAssignmentResult, TimetableEntryResult } from "@classroom-os/types";
import { router, useLocalSearchParams } from "expo-router";

import { AppButton, AppHeader, Card, ErrorState, ListTile, LoadingSkeleton, SafeScreen, ThemedText } from "@/components/ui/primitives";
import { useAuthenticatedQuery } from "@/hooks/use-authenticated-query";
import { formatTimetableTime } from "@/lib/time";
import { thaiErrorMessage } from "@/lib/api-error";

const weekday = ["", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];

export default function ClassDetailScreen() {
  const { id, returnWeekday, returnView } = useLocalSearchParams<{ id: string; returnWeekday?: string; returnView?: string }>();
  const weekdayNumber = Number(returnWeekday);
  const timetableReturnPath = weekdayNumber >= 1 && weekdayNumber <= 5
    ? `/(tabs)/classes?weekday=${weekdayNumber}&view=${returnView === "week" ? "week" : "day"}`
    : "/(tabs)/classes";
  const assignments = useAuthenticatedQuery<TeachingAssignmentResult[]>(["assignments"], "/api/teaching-assignments");
  const timetable = useAuthenticatedQuery<TimetableEntryResult[]>(["timetable"], "/api/timetable");
  if (assignments.isLoading || timetable.isLoading) return <LoadingSkeleton />;
  const assignment = assignments.data?.find((item) => item.id === id);
  if (assignments.error || timetable.error || !assignment) return <SafeScreen><AppButton label="← กลับไปตารางสอน" tone="secondary" onPress={() => router.replace(timetableReturnPath as never)} /><ErrorState message={assignment ? thaiErrorMessage(assignments.error ?? timetable.error) : "ไม่พบชั้นเรียนนี้ในงานสอนของคุณ"} /></SafeScreen>;
  const slots = timetable.data?.filter((item) => item.teachingAssignmentId === id) ?? [];

  return <SafeScreen>
    <AppButton label="← กลับไปตารางสอน" tone="secondary" onPress={() => router.replace(timetableReturnPath as never)} />
    <AppHeader title={assignment.classroomName} subtitle={`${assignment.subjectName} · ${assignment.termName}`} />
    <Card>
      <ThemedText>ปีการศึกษา {assignment.academicYearName}</ThemedText>
      <ThemedText tone="muted">ตารางประจำสัปดาห์ {slots.length} คาบ</ThemedText>
      {slots.map((slot) => <ListTile key={slot.id} title={`${weekday[slot.weekday]} · ${formatTimetableTime(slot.startTime)}–${formatTimetableTime(slot.endTime)} น.`} subtitle={slot.room ? `ห้อง ${slot.room}` : "ไม่ระบุห้อง"} />)}
    </Card>
  </SafeScreen>;
}
