import type { ClassroomResult, TeachingAssignmentResult, TimetableCoverageResult, TimetableEntryResult, TodayClassResult, TodayTimetableResult } from "@classroom-os/types";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { AppButton, AppHeader, Card, Chip, EmptyState, ErrorState, ListTile, OfflineBanner, SafeScreen, SearchBar, SectionHeader, SkeletonCard, StatusBadge, ThemedText } from "@/components/ui/primitives";
import { spacing } from "@/constants/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { useTheme } from "@/features/theme/theme-context";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { apiRequest } from "@/lib/api-client";
import { thaiErrorMessage } from "@/lib/api-error";
import { matchesSearch } from "@/lib/search";
import { formatTimetableTime } from "@/lib/time";

const weekdays = [
  { value: 1, label: "วันจันทร์" }, { value: 2, label: "วันอังคาร" }, { value: 3, label: "วันพุธ" },
  { value: 4, label: "วันพฤหัสบดี" }, { value: 5, label: "วันศุกร์" },
] as const;
type StatusFilter = "all" | "today" | "upcoming" | "completed";

export function ClassesScreen() {
  const { token, user } = useAuth();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();
  const [view, setView] = useState<"day" | "week">("day");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
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
    onSuccess: async (session) => { await queryClient.invalidateQueries({ queryKey: ["today"] }); router.push(`/sessions/${session.id}`); },
  });
  const resolveCoverage = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "declined" }) => apiRequest<TimetableCoverageResult>(`/api/timetable/coverage/${id}`, { method: "PATCH", token, body: { status } }),
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["timetable-coverages"] }), queryClient.invalidateQueries({ queryKey: ["today"] })]); },
  });

  const isLoading = assignments.isLoading || timetable.isLoading || classrooms.isLoading || today.isLoading || coverages.isLoading;
  const error = assignments.error ?? timetable.error ?? classrooms.error ?? today.error ?? coverages.error;
  const todayByEntry = useMemo(() => new Map((today.data?.classes ?? []).map((item) => [item.timetableEntry.id, item])), [today.data?.classes]);
  const entries = useMemo(() => [...new Map([...(timetable.data ?? []), ...(today.data?.classes.map((item) => item.timetableEntry) ?? [])].map((entry) => [entry.id, entry])).values()]
    .filter((entry) => entry.isActive && entry.weekday >= 1 && entry.weekday <= 5)
    .filter((entry) => matchesSearch(search, [entry.classroomName, entry.subjectName, entry.room]))
    .filter((entry) => {
      const current = todayByEntry.get(entry.id);
      if (filter === "today") return Boolean(current);
      if (filter === "upcoming") return current?.status === "scheduled";
      if (filter === "completed") return current?.status === "completed";
      return true;
    })
    .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime)), [filter, search, timetable.data, today.data?.classes, todayByEntry]);

  if (isLoading) return <SafeScreen><SkeletonCard /><SkeletonCard /><SkeletonCard /></SafeScreen>;
  if (error || !today.data) return <SafeScreen><ErrorState error={error} onRetry={() => { void assignments.refetch(); void timetable.refetch(); void classrooms.refetch(); void today.refetch(); void coverages.refetch(); }} /></SafeScreen>;

  const todayWeekday = new Date(`${today.data.localDate}T12:00:00Z`).getUTCDay();
  const activeWeekday = selectedWeekday ?? (todayWeekday >= 1 && todayWeekday <= 5 ? todayWeekday : 1);
  const visibleDays = view === "week" ? weekdays : weekdays.filter((day) => day.value === activeWeekday);
  const refreshing = assignments.isRefetching || timetable.isRefetching || classrooms.isRefetching || today.isRefetching || coverages.isRefetching;
  const refresh = () => { void assignments.refetch(); void timetable.refetch(); void classrooms.refetch(); void today.refetch(); void coverages.refetch(); };
  const incomingCoverages = coverages.data?.filter((item) => item.status === "pending" && item.substituteTeacherId === user?.teacherId) ?? [];
  const updatedTimes = [assignments.dataUpdatedAt, timetable.dataUpdatedAt, classrooms.dataUpdatedAt, today.dataUpdatedAt].filter((value) => value > 0);

  return <SafeScreen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
    <OfflineBanner visible={!isOnline} lastUpdated={updatedTimes.length ? Math.min(...updatedTimes) : undefined} />
    <AppHeader title="ตารางสอนและชั้นเรียน" subtitle="คาบเรียน ห้องเรียน และ Live Class อยู่ในที่เดียว" />
    <Card><ListTile title={today.data.currentTerm?.name ?? "ยังไม่กำหนดภาคเรียน"} subtitle={`${today.data.currentAcademicYear?.name ?? "ยังไม่กำหนดปีการศึกษา"} · งานสอน ${assignments.data?.length ?? 0} รายการ`} trailing={<StatusBadge label="บริบทของฉัน" tone="success" />} /></Card>
    <SearchBar accessibilityLabel="ค้นหาชั้นเรียน" placeholder="ค้นหาห้อง วิชา หรือห้องสอน" value={search} onChangeText={setSearch} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{([['all', 'ทั้งหมด'], ['today', 'วันนี้'], ['upcoming', 'กำลังจะสอน'], ['completed', 'สอนแล้ว']] as const).map(([value, label]) => <Chip key={value} label={label} selected={filter === value} onPress={() => setFilter(value)} />)}</ScrollView>

    {incomingCoverages.length ? <View style={styles.day}><SectionHeader title="คำขอสอนแทน" action={<StatusBadge label={`${incomingCoverages.length} รายการ`} tone="live" />}/>{incomingCoverages.map((item) => <Card key={item.id}><ThemedText style={styles.classroom}>{item.kind === "swap" ? "คำขอสลับคาบ" : "คำขอฝากสอน"}</ThemedText><ThemedText>{item.localDate} · จาก {item.originalTeacherName}</ThemedText>{item.reason ? <ThemedText tone="muted">{item.reason}</ThemedText> : null}<AppButton label="ยอมรับ" onPress={() => resolveCoverage.mutate({ id: item.id, status: "active" })} disabled={!isOnline || resolveCoverage.isPending} /><AppButton label="ปฏิเสธ" tone="secondary" onPress={() => resolveCoverage.mutate({ id: item.id, status: "declined" })} disabled={!isOnline || resolveCoverage.isPending} /></Card>)}</View> : null}
    <View accessibilityRole="tablist" style={[styles.viewSwitch, { backgroundColor: colors.border }]}>
      {([['day', 'รายวัน'], ['week', 'ทั้งสัปดาห์']] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: view === value }} onPress={() => setView(value)} style={[styles.viewOption, view === value && { backgroundColor: colors.surface }]}><ThemedText tone={view === value ? "primary" : "muted"} style={styles.viewText}>{label}</ThemedText></Pressable>)}
    </View>
    {view === "day" ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{weekdays.map((day) => <Chip key={day.value} label={day.label.replace("วัน", "")} selected={activeWeekday === day.value} accessibilityLabel={`ดูตาราง${day.label}`} onPress={() => setSelectedWeekday(day.value)} />)}</ScrollView> : null}
    {start.error ? <ThemedText accessibilityRole="alert" tone="danger">{thaiErrorMessage(start.error)}</ThemedText> : null}
    {resolveCoverage.error ? <ThemedText accessibilityRole="alert" tone="danger">{thaiErrorMessage(resolveCoverage.error)}</ThemedText> : null}

    {entries.length ? visibleDays.map((day) => {
      const dailyEntries = entries.filter((entry) => entry.weekday === day.value);
      if (!dailyEntries.length) return view === "day" ? <EmptyState key={day.value} title={`${day.label}ไม่มีคาบสอน`} description="เลือกวันอื่นหรือดูตารางทั้งสัปดาห์" /> : null;
      return <View key={day.value} style={styles.day}><SectionHeader title={day.label} action={<StatusBadge label={`${dailyEntries.length} คาบ`} />}/>{dailyEntries.map((entry) => {
        const assignment = assignments.data?.find((item) => item.id === entry.teachingAssignmentId);
        const classroom = classrooms.data?.find((item) => item.id === entry.classroomId);
        const todayClass = todayByEntry.get(entry.id);
        return <Card key={entry.id}>
          <View style={styles.row}><View style={styles.flex}><ThemedText tone="primary" style={styles.time}>{formatTimetableTime(entry.startTime)}–{formatTimetableTime(entry.endTime)} น.</ThemedText><ThemedText style={styles.classroom}>{entry.classroomName}</ThemedText><ThemedText>{entry.subjectName}</ThemedText></View>{todayClass ? <StatusBadge label={todayClass.status === "live" ? "LIVE" : todayClass.status === "completed" ? "เสร็จแล้ว" : todayClass.status === "scheduled" ? "วันนี้" : "ยกเลิก"} tone={todayClass.status === "live" ? "live" : todayClass.status === "completed" ? "success" : todayClass.status === "cancelled" ? "danger" : "neutral"} /> : <StatusBadge label="งานสอนปัจจุบัน" />}</View>
          <ThemedText tone="muted">{entry.room ? `ห้อง ${entry.room} · ` : ""}นักเรียน {classroom?.studentCount ?? 0} คน · ครู {entry.teacherName}</ThemedText>
          {todayClass?.status === "live" && todayClass.session ? <AppButton label="กลับเข้าสู่คาบที่กำลังสอน" onPress={() => router.push(`/sessions/${todayClass.session!.id}`)} /> : null}
          {todayClass?.status === "scheduled" ? <AppButton label={start.isPending ? "กำลังเริ่มคาบ…" : "เริ่มคาบ"} onPress={() => start.mutate(todayClass)} disabled={!isOnline || start.isPending} /> : null}
          {todayClass?.status === "completed" && todayClass.session ? <AppButton label="ดูสรุปคาบ" tone="secondary" onPress={() => router.push(`/sessions/${todayClass.session!.id}/summary`)} /> : null}
          {assignment ? <AppButton label="ดูรายละเอียดชั้นเรียน" tone="secondary" onPress={() => router.push(`/classes/${assignment.id}`)} /> : null}
        </Card>;
      })}</View>;
    }) : <EmptyState title="ไม่พบตารางสอน" description={search || filter !== "all" ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "ติดต่อผู้ดูแลโรงเรียนเพื่อเพิ่มตารางสอน"} />}
  </SafeScreen>;
}

const styles = StyleSheet.create({ viewSwitch: { flexDirection: "row", padding: 4, borderRadius: 14 }, viewOption: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 10 }, viewText: { fontSize: 16, fontWeight: "700" }, chips: { gap: spacing.sm }, day: { gap: spacing.md }, row: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" }, flex: { flex: 1 }, time: { fontSize: 18, fontWeight: "800" }, classroom: { fontSize: 18, fontWeight: "800", marginTop: spacing.sm } });
