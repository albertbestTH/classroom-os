import type { ClassroomResult, TeachingAssignmentResult, TimetableCoverageResult, TimetableEntryResult, TodayClassResult, TodayTimetableResult } from "@classroom-os/types";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppButton, AppHeader, Card, EmptyState, ErrorState, LoadingSkeleton, OfflineBanner, SafeScreen, SearchBar, SectionHeader, StatusBadge } from "@/components/ui/primitives";
import { colors, spacing } from "@/constants/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { apiRequest } from "@/lib/api-client";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { thaiErrorMessage } from "@/lib/api-error";
import { matchesSearch } from "@/lib/search";
import { formatTimetableTime } from "@/lib/time";

const weekdays = [
  { value: 1, label: "วันจันทร์" },
  { value: 2, label: "วันอังคาร" },
  { value: 3, label: "วันพุธ" },
  { value: 4, label: "วันพฤหัสบดี" },
  { value: 5, label: "วันศุกร์" },
] as const;

export function ClassesScreen() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"day" | "week">("day");
  const [search, setSearch] = useState("");
  const { isOnline } = useNetworkStatus();
  const [selectedWeekday, setSelectedWeekday] = useState<number | null>(null);
  const [assignments, timetable, classrooms, today, coverages] = useQueries({ queries: [
    { queryKey: ["assignments"], queryFn: () => apiRequest<TeachingAssignmentResult[]>("/api/teaching-assignments", { token }) },
    { queryKey: ["timetable"], queryFn: () => apiRequest<TimetableEntryResult[]>("/api/timetable", { token }) },
    { queryKey: ["classrooms"], queryFn: () => apiRequest<ClassroomResult[]>("/api/classrooms", { token }) },
    { queryKey: ["today"], queryFn: () => apiRequest<TodayTimetableResult>("/api/me/today", { token }) },
    { queryKey: ["timetable-coverages"], queryFn: () => apiRequest<TimetableCoverageResult[]>("/api/timetable/coverage", { token }) },
  ] });
  const start = useMutation({
    mutationFn: async (item: TodayClassResult) => {
      const session = item.session ?? await apiRequest<{ id: string }>(`/api/timetable/${item.timetableEntry.id}/materialize`, { method: "POST", token, body: { localDate: today.data?.localDate } });
      return apiRequest<{ id: string }>(`/api/sessions/${session.id}/start`, { method: "POST", token, body: {} });
    },
    onSuccess: async (session) => {
      await queryClient.invalidateQueries({ queryKey: ["today"] });
      router.push(`/sessions/${session.id}`);
    },
  });
  const resolveCoverage = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "declined" }) =>
      apiRequest<TimetableCoverageResult>(`/api/timetable/coverage/${id}`, { method: "PATCH", token, body: { status } }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["timetable-coverages"] }),
        queryClient.invalidateQueries({ queryKey: ["today"] }),
      ]);
    },
  });

  const isLoading = assignments.isLoading || timetable.isLoading || classrooms.isLoading || today.isLoading || coverages.isLoading;
  if (isLoading) return <LoadingSkeleton />;
  const error = assignments.error ?? timetable.error ?? classrooms.error ?? today.error ?? coverages.error;
  if (error) return <SafeScreen><ErrorState message={thaiErrorMessage(error)} onRetry={() => { void assignments.refetch(); void timetable.refetch(); void classrooms.refetch(); void today.refetch(); void coverages.refetch(); }} /></SafeScreen>;

  const entries = [...new Map([
    ...(timetable.data ?? []),
    ...(today.data?.classes.map((item) => item.timetableEntry) ?? []),
  ].map((entry) => [entry.id, entry])).values()]
    .filter((entry) => entry.isActive && entry.weekday >= 1 && entry.weekday <= 5)
    .filter((entry) => matchesSearch(search, [entry.classroomName, entry.subjectName, entry.room]))
    .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));
  const todayWeekday = new Date(`${today.data!.localDate}T12:00:00Z`).getUTCDay();
  const activeWeekday = selectedWeekday ?? (todayWeekday >= 1 && todayWeekday <= 5 ? todayWeekday : 1);
  const visibleDays = view === "week" ? weekdays : weekdays.filter((day) => day.value === activeWeekday);
  const refreshing = assignments.isRefetching || timetable.isRefetching || classrooms.isRefetching || today.isRefetching || coverages.isRefetching;
  const refresh = () => { void assignments.refetch(); void timetable.refetch(); void classrooms.refetch(); void today.refetch(); void coverages.refetch(); };
  const incomingCoverages = coverages.data?.filter((item) => item.status === "pending" && item.substituteTeacherId === user?.teacherId) ?? [];

  return <SafeScreen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
    <OfflineBanner visible={!isOnline} lastUpdated={Math.min(...[assignments.dataUpdatedAt, timetable.dataUpdatedAt, classrooms.dataUpdatedAt, today.dataUpdatedAt].filter(Boolean))} />
    <AppHeader title="ตารางสอน" subtitle="คาบเรียน ห้องเรียน และ Live Class อยู่ในที่เดียว" />
    <SearchBar accessibilityLabel="ค้นหาชั้นเรียน" placeholder="ค้นหาห้อง วิชา หรือห้องสอน" value={search} onChangeText={setSearch} />
    {incomingCoverages.length ? <View style={styles.day}><SectionHeader title="คำขอสอนแทน" action={<StatusBadge label={`${incomingCoverages.length} รายการ`} tone="live" />} />{incomingCoverages.map((item) => <Card key={item.id}><Text style={styles.classroom}>{item.kind === "swap" ? "คำขอสลับคาบ" : "คำขอฝากสอน"}</Text><Text style={styles.subject}>{item.localDate} · จาก {item.originalTeacherName}</Text>{item.reason ? <Text style={styles.meta}>{item.reason}</Text> : null}<AppButton label="ยอมรับ" onPress={() => resolveCoverage.mutate({ id: item.id, status: "active" })} disabled={resolveCoverage.isPending} /><AppButton label="ปฏิเสธ" tone="secondary" onPress={() => resolveCoverage.mutate({ id: item.id, status: "declined" })} disabled={resolveCoverage.isPending} /></Card>)}</View> : null}
    <View accessibilityRole="tablist" style={styles.viewSwitch}>
      <Pressable accessibilityRole="tab" accessibilityState={{ selected: view === "day" }} onPress={() => setView("day")} style={[styles.viewOption, view === "day" && styles.viewOptionActive]}><Text style={[styles.viewText, view === "day" && styles.viewTextActive]}>รายวัน</Text></Pressable>
      <Pressable accessibilityRole="tab" accessibilityState={{ selected: view === "week" }} onPress={() => setView("week")} style={[styles.viewOption, view === "week" && styles.viewOptionActive]}><Text style={[styles.viewText, view === "week" && styles.viewTextActive]}>ทั้งสัปดาห์</Text></Pressable>
    </View>
    {view === "day" ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayPicker}>
      {weekdays.map((day) => <Pressable key={day.value} accessibilityRole="button" accessibilityState={{ selected: activeWeekday === day.value }} accessibilityLabel={`ดูตาราง${day.label}`} onPress={() => setSelectedWeekday(day.value)} style={[styles.dayOption, activeWeekday === day.value && styles.dayOptionActive]}><Text style={[styles.dayText, activeWeekday === day.value && styles.dayTextActive]}>{day.label.replace("วัน", "")}</Text></Pressable>)}
    </ScrollView> : null}
    {start.error ? <Text accessibilityRole="alert" style={styles.error}>{thaiErrorMessage(start.error)}</Text> : null}
    {resolveCoverage.error ? <Text accessibilityRole="alert" style={styles.error}>{thaiErrorMessage(resolveCoverage.error)}</Text> : null}
    {entries.length ? visibleDays.map((day) => {
      const dailyEntries = entries.filter((entry) => entry.weekday === day.value);
      if (!dailyEntries.length) return view === "day" ? <EmptyState key={day.value} title={`${day.label}ไม่มีคาบสอน`} description="เลือกวันอื่นหรือดูตารางทั้งสัปดาห์" /> : null;
      return <View key={day.value} style={styles.day}>
        <SectionHeader title={day.label} action={<StatusBadge label={`${dailyEntries.length} คาบ`} />} />
        {dailyEntries.map((entry) => {
          const assignment = assignments.data?.find((item) => item.id === entry.teachingAssignmentId);
          const classroom = classrooms.data?.find((item) => item.id === entry.classroomId);
          const todayClass = today.data?.classes.find((item) => item.timetableEntry.id === entry.id);
          return <Card key={entry.id}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text style={styles.time}>{formatTimetableTime(entry.startTime)}–{formatTimetableTime(entry.endTime)} น.</Text>
                <Text style={styles.classroom}>{entry.classroomName}</Text>
                <Text style={styles.subject}>{entry.subjectName}</Text>
              </View>
              {todayClass ? <StatusBadge label={todayClass.status === "live" ? "LIVE" : todayClass.status === "completed" ? "เสร็จแล้ว" : todayClass.status === "scheduled" ? "วันนี้" : "ยกเลิก"} tone={todayClass.status === "live" ? "live" : todayClass.status === "completed" ? "success" : todayClass.status === "cancelled" ? "danger" : "neutral"} /> : null}
            </View>
            <Text style={styles.meta}>{entry.room ? `ห้อง ${entry.room} · ` : ""}นักเรียน {classroom?.studentCount ?? 0} คน</Text>
            {todayClass?.status === "live" && todayClass.session ? <AppButton label="กลับเข้าสู่คาบที่กำลังสอน" onPress={() => router.push(`/sessions/${todayClass.session!.id}`)} /> : null}
            {todayClass?.status === "scheduled" ? <AppButton label={start.isPending ? "กำลังเริ่มคาบ…" : "เริ่มคาบ"} onPress={() => start.mutate(todayClass)} disabled={start.isPending} /> : null}
            {todayClass?.status === "completed" && todayClass.session ? <AppButton label="ดูสรุปคาบ" tone="secondary" onPress={() => router.push(`/sessions/${todayClass.session!.id}/summary`)} /> : null}
            {assignment ? <AppButton label="ดูรายละเอียดชั้นเรียน" tone="secondary" onPress={() => router.push(`/classes/${assignment.id}`)} /> : null}
          </Card>;
        })}
      </View>;
    }) : <EmptyState title="ยังไม่มีตารางสอน" description="ติดต่อผู้ดูแลโรงเรียนเพื่อเพิ่มตารางสอน" />}
  </SafeScreen>;
}

const styles = StyleSheet.create({
  viewSwitch: { flexDirection: "row", padding: 4, borderRadius: 14, backgroundColor: colors.border },
  viewOption: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  viewOptionActive: { backgroundColor: colors.surface },
  viewText: { color: colors.muted, fontSize: 16, fontWeight: "700" },
  viewTextActive: { color: colors.primaryDark },
  dayPicker: { gap: spacing.sm },
  dayOption: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: 999, backgroundColor: colors.surface },
  dayOptionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  dayText: { color: colors.muted, fontWeight: "700" },
  dayTextActive: { color: colors.primaryDark },
  day: { gap: spacing.md },
  row: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  flex: { flex: 1 },
  time: { color: colors.primaryDark, fontSize: 18, fontWeight: "800" },
  classroom: { color: colors.text, fontSize: 18, fontWeight: "800", marginTop: spacing.sm },
  subject: { color: colors.text, fontSize: 16, marginTop: 4 },
  meta: { color: colors.muted, fontSize: 15 },
  error: { color: colors.danger },
});
