import type { CurrentUserResult, DashboardOverviewResult, TodayClassResult, TodayTimetableResult } from "@classroom-os/types";
import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { AppIcon, type AppIconName } from "@/components/ui/icons";
import { Avatar } from "@/components/ui/primitives";
import { radius, spacing, touchTargets } from "@/constants/tokens";
import { useTheme } from "@/features/theme/theme-context";
import { getApiBaseUrl } from "@/lib/environment";
import { canStartScheduledSession } from "@/features/sessions/session-time";

import { sortTodayClassesByStartTime } from "./today-presentation";

const statusLabels = { scheduled: "รอเริ่ม", live: "กำลังสอน", completed: "เช็กชื่อแล้ว", cancelled: "ยกเลิก", missed: "เลยเวลา" } as const;

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(new Date(value));
}

function SectionTitle({ title, action }: { title: string; action?: string }) {
  const { colors } = useTheme();
  return <View style={styles.sectionTitleRow}><Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>{action ? <Text style={[styles.sectionAction, { color: colors.primary }]}>{action}</Text> : null}</View>;
}

function MobileHeader({ user, actionCount }: { user: CurrentUserResult | null; actionCount: number }) {
  const brandImageUri = (() => { try { return `${getApiBaseUrl()}/brand/kradandum-app-icon.png`; } catch { return null; } })();
  const profileImageUri = (() => { if (!user?.profileImageKey) return null; try { return `${getApiBaseUrl()}${user.profileImageKey}`; } catch { return null; } })();
  const name = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
  return <View style={styles.header}>
    <View style={styles.brandMark}>{brandImageUri ? <Image accessibilityIgnoresInvertColors source={{ uri: brandImageUri }} style={styles.brandImage} /> : null}</View>
    <View style={styles.headerIdentity}><Text style={styles.greeting}>สวัสดีตอนเช้า</Text><Text numberOfLines={1} style={styles.teacherName}>ครู{name || "ผู้สอน"}</Text></View>
    <View style={styles.notification}><AppIcon name="bell" color="#FFFFFF" size={22} />{actionCount > 0 ? <View style={styles.notificationBadge}><Text style={styles.notificationCount}>{Math.min(actionCount, 9)}</Text></View> : null}</View>
    <Avatar label={name || "ครูผู้สอน"} imageUri={profileImageUri} size={42} />
  </View>;
}

function NextClassHero({ item, index, now, isOnline, isStarting, onOpen }: { item: TodayClassResult | null; index: number; now: number; isOnline: boolean; isStarting: boolean; onOpen(item: TodayClassResult): void }) {
  if (!item) return <View style={styles.hero}><Text style={styles.heroEyebrow}>คาบถัดไป</Text><Text style={styles.heroEmptyTitle}>ไม่มีคาบที่ต้องดำเนินการ</Text><Text style={styles.heroMeta}>ตรวจสอบตารางสอนสำหรับคาบถัดไป</Text></View>;
  const session = item.session;
  const enrolled = session?.enrolledStudentCount ?? 0;
  const recorded = session?.attendanceRecordedCount ?? 0;
  const progress = enrolled > 0 ? Math.min(100, Math.round((recorded / enrolled) * 100)) : 0;
  const minutes = Math.max(0, Math.ceil((new Date(item.scheduledStart).getTime() - now) / 60_000));
  const canStart = item.status === "scheduled" && canStartScheduledSession(item.scheduledStart, item.scheduledEnd, now);
  const buttonLabel = item.status === "live" ? (recorded >= enrolled && enrolled > 0 ? "แก้ไขการเช็กชื่อ" : "เช็กชื่อเข้าเรียน") : canStart ? "เริ่มคาบเรียน" : `เริ่มได้ ${timeLabel(item.scheduledStart)}`;
  return <View style={styles.hero}>
    <View style={styles.heroTop}><View style={styles.heroCountdown}><Text style={styles.heroEyebrow}>{item.status === "live" ? "คาบกำลังสอน" : "คาบถัดไปอีก"}</Text><Text style={styles.heroTime}>{item.status === "live" ? "LIVE" : `${minutes} นาที`}</Text><Text style={styles.heroMeta}>เริ่ม {timeLabel(item.scheduledStart)}</Text></View><View style={styles.heroDivider} /><View style={styles.heroSubject}><View style={styles.periodBadge}><Text style={styles.periodBadgeText}>คาบที่ {index + 1}</Text></View><Text numberOfLines={1} style={styles.heroSubjectName}>{item.timetableEntry.subjectName}</Text><Text numberOfLines={1} style={styles.heroMeta}>{item.timetableEntry.classroomName}{item.timetableEntry.room ? ` · ห้อง ${item.timetableEntry.room}` : ""}</Text></View></View>
    {enrolled > 0 ? <View><View style={styles.progressLabelRow}><Text style={styles.heroProgressLabel}>เช็กชื่อแล้ว {recorded}/{enrolled} คน</Text><Text style={styles.heroProgressLabel}>{progress}%</Text></View><View style={styles.heroTrack}><View style={[styles.heroFill, { width: `${progress}%` }]} /></View></View> : null}
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: item.status === "scheduled" && (!canStart || !isOnline) }} disabled={item.status === "scheduled" && (!canStart || !isOnline)} onPress={() => onOpen(item)} style={({ pressed }) => [styles.heroButton, pressed && styles.pressed, item.status === "scheduled" && (!canStart || !isOnline) && styles.disabled]}><AppIcon name="attendance" color="#1746C8" size={20} /><Text style={styles.heroButtonText}>{isStarting ? "กำลังเริ่มคาบ…" : buttonLabel}</Text></Pressable>
  </View>;
}

const quickActions: { label: string; caption: string; icon: AppIconName; color: string; soft: string; route: string }[] = [
  { label: "เช็กชื่อ", caption: "รายชื่อวันนี้", icon: "attendance", color: "#16A36A", soft: "#E4F8EF", route: "/(tabs)/classes" },
  { label: "ตารางสอน", caption: "ดูคาบเรียน", icon: "calendar", color: "#2563EB", soft: "#E8F1FF", route: "/(tabs)/classes" },
  { label: "คะแนน", caption: "บันทึกคะแนน", icon: "scores", color: "#F59E0B", soft: "#FFF3E3", route: "/(tabs)/scores" },
  { label: "โปรไฟล์", caption: "ข้อมูลของฉัน", icon: "profile", color: "#7C3AED", soft: "#F1EAFE", route: "/(tabs)/profile" },
];

function QuickActions({ live }: { live: TodayClassResult | null }) {
  const { colors } = useTheme();
  return <View style={styles.quickGrid}>{quickActions.map((action) => <Pressable key={action.label} accessibilityRole="button" onPress={() => { if (action.label === "เช็กชื่อ" && live?.session) router.push(`/sessions/${live.session.id}/attendance?classroomId=${live.timetableEntry.classroomId}` as never); else router.push(action.route as never); }} style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}><View style={[styles.quickIcon, { backgroundColor: action.soft }]}><AppIcon name={action.icon} color={action.color} size={21} /></View><Text style={[styles.quickLabel, { color: colors.text }]}>{action.label}</Text><Text numberOfLines={1} style={[styles.quickCaption, { color: colors.muted }]}>{action.caption}</Text></Pressable>)}</View>;
}

function AttendanceDonut({ overview }: { overview?: DashboardOverviewResult }) {
  const { colors } = useTheme();
  if (!overview) return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><SectionTitle title="ภาพรวมการเข้าเรียนวันนี้" /><Text style={[styles.emptyText, { color: colors.muted }]}>กำลังโหลดภาพรวมการเข้าเรียน…</Text></View>;
  const circumference = 2 * Math.PI * 45;
  const totals = overview.attendance.totals;
  const eligible = overview.attendance.eligibleCount;
  const segments = [
    { key: "present" as const, label: "มาเรียน", color: "#16B67A" },
    { key: "absent" as const, label: "ขาดเรียน", color: "#F04D45" },
    { key: "late" as const, label: "สาย", color: "#F59E0B" },
    { key: "leave" as const, label: "ลา", color: "#2563EB" },
    { key: "unrecorded" as const, label: "ยังไม่เช็กชื่อ", color: "#94A3B8" },
  ];
  let offset = 0;
  const percentage = overview.attendance.attendancePercentage;
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><SectionTitle title="ภาพรวมการเข้าเรียนวันนี้" /><View style={styles.attendanceBody}><View accessible accessibilityRole="image" accessibilityLabel={`มาเรียนหรือมาสาย ${percentage} เปอร์เซ็นต์ จาก ${eligible} คน`} style={styles.donutWrap}><Svg width={126} height={126} viewBox="0 0 120 120"><Circle cx="60" cy="60" r="45" fill="none" stroke={colors.border} strokeWidth="16" />{segments.map((segment) => { const value = eligible > 0 ? (totals[segment.key] / eligible) * 100 : 0; const segmentLength = (value / 100) * circumference; const circle = <Circle key={segment.key} cx="60" cy="60" r="45" fill="none" stroke={segment.color} strokeWidth="16" strokeDasharray={`${segmentLength} ${circumference - segmentLength}`} strokeDashoffset={-offset} rotation={-90} origin="60,60" />; offset += segmentLength; return circle; })}</Svg><View style={styles.donutCenter}><Text style={[styles.donutValue, { color: colors.text }]}>{percentage}%</Text><Text style={[styles.donutCaption, { color: colors.muted }]}>มาเรียน</Text></View></View><View style={styles.legend}>{segments.map((segment) => <View key={segment.key} style={styles.legendRow}><View style={[styles.legendDot, { backgroundColor: segment.color }]} /><Text style={[styles.legendLabel, { color: colors.text }]}>{segment.label}</Text><Text style={[styles.legendValue, { color: colors.text }]}>{totals[segment.key]} คน</Text></View>)}</View></View></View>;
}

function TodaySchedule({ data: rawData, now, onOpen }: { data: TodayTimetableResult; now: number; onOpen(item: TodayClassResult): void }) {
  const { colors } = useTheme();
  const data = { ...rawData, classes: sortTodayClassesByStartTime(rawData.classes) };
  return <View><SectionTitle title="ตารางสอนวันนี้" action="ดูทั้งหมด" /><View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>{data.classes.length ? data.classes.slice(0, 5).map((item, index) => <Pressable key={item.timetableEntry.id} accessibilityRole="button" onPress={() => onOpen(item)} style={({ pressed }) => [styles.scheduleRow, index > 0 && { borderTopColor: colors.border, borderTopWidth: 1 }, item.status === "live" && { backgroundColor: colors.primarySoft }, pressed && styles.pressed]}><Text style={[styles.scheduleTime, { color: item.status === "live" ? colors.primary : colors.muted }]}>{timeLabel(item.scheduledStart)}</Text><View style={styles.scheduleMain}><Text numberOfLines={1} style={[styles.scheduleSubject, { color: colors.text }]}>{item.timetableEntry.subjectName}</Text><Text numberOfLines={1} style={[styles.scheduleMeta, { color: colors.muted }]}>{item.timetableEntry.classroomName}</Text></View><View style={[styles.scheduleBadge, { backgroundColor: item.status === "completed" ? colors.successSoft : item.status === "live" ? colors.primarySoft : item.status === "missed" ? colors.warningSoft : colors.surfaceRaised }]}><Text style={[styles.scheduleBadgeText, { color: item.status === "completed" ? colors.success : item.status === "live" ? colors.primary : item.status === "missed" ? colors.warning : colors.muted }]}>{item.status === "scheduled" && !canStartScheduledSession(item.scheduledStart, item.scheduledEnd, now) ? "รอเริ่ม" : statusLabels[item.status]}</Text></View><AppIcon name="arrow" color={colors.muted} size={16} /></Pressable>) : <Text style={[styles.emptyText, { color: colors.muted }]}>วันนี้ไม่มีคาบสอน</Text>}</View></View>;
}

function PendingWork({ overview }: { overview?: DashboardOverviewResult }) {
  const { colors } = useTheme();
  const actions = overview?.actions.slice(0, 3) ?? [];
  if (!actions.length) return null;
  return <View><SectionTitle title="งานที่ต้องติดตาม" action="ดูทั้งหมด" /><View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>{actions.map((action, index) => <Pressable key={action.id} accessibilityRole="button" onPress={() => router.push((action.href.startsWith("/sessions/") ? action.href : "/(tabs)/classes") as never)} style={({ pressed }) => [styles.pendingRow, index > 0 && { borderTopColor: colors.border, borderTopWidth: 1 }, pressed && styles.pressed]}><View style={[styles.pendingIcon, { backgroundColor: action.priority === "high" ? colors.dangerSoft : colors.primarySoft }]}><AppIcon name="attendance" color={action.priority === "high" ? colors.danger : colors.primary} size={19} /></View><View style={styles.scheduleMain}><Text numberOfLines={1} style={[styles.scheduleSubject, { color: colors.text }]}>{action.title}</Text><Text numberOfLines={1} style={[styles.scheduleMeta, { color: colors.muted }]}>{action.description}</Text></View><Text style={[styles.priority, { color: action.priority === "high" ? colors.danger : colors.warning }]}>{action.priority === "high" ? "เร่งด่วน" : "ติดตาม"}</Text><AppIcon name="arrow" color={colors.muted} size={16} /></Pressable>)}</View></View>;
}

export function TodayDashboard({ user, data: rawData, overview, now, isOnline, isStarting, onOpen }: { user: CurrentUserResult | null; data: TodayTimetableResult; overview?: DashboardOverviewResult; now: number; isOnline: boolean; isStarting: boolean; onOpen(item: TodayClassResult): void }) {
  const data = { ...rawData, classes: sortTodayClassesByStartTime(rawData.classes) };
  const focus = data.classes.find((item) => item.status === "live") ?? data.classes.find((item) => item.status === "scheduled") ?? null;
  const focusIndex = focus ? Math.max(0, data.classes.findIndex((item) => item.timetableEntry.id === focus.timetableEntry.id)) : 0;
  return <><MobileHeader user={user} actionCount={overview?.actions.length ?? data.missedCount + data.incompleteAttendanceCount} /><View style={styles.dashboardBody}><NextClassHero item={focus} index={focusIndex} now={now} isOnline={isOnline} isStarting={isStarting} onOpen={onOpen} /><QuickActions live={data.classes.find((item) => item.status === "live") ?? null} /><AttendanceDonut overview={overview} /><TodaySchedule data={data} now={now} onOpen={onOpen} /><PendingWork overview={overview} /></View></>;
}

const styles = StyleSheet.create({
  header: { marginHorizontal: -spacing.lg, marginTop: -spacing.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 34, minHeight: 116, backgroundColor: "#0B3CAA", flexDirection: "row", alignItems: "center", gap: spacing.md },
  brandMark: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#105BE8", alignItems: "center", justifyContent: "center", overflow: "hidden" }, brandImage: { width: 42, height: 42 },
  headerIdentity: { flex: 1 }, greeting: { color: "#DCE8FF", fontSize: 13 }, teacherName: { color: "#FFFFFF", fontSize: 20, lineHeight: 26, fontWeight: "800" }, notification: { width: touchTargets.minimum, height: touchTargets.minimum, alignItems: "center", justifyContent: "center" }, notificationBadge: { position: "absolute", right: 2, top: 1, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: "#EF4444", alignItems: "center", justifyContent: "center" }, notificationCount: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  dashboardBody: { marginTop: -26, gap: spacing.lg }, hero: { minHeight: 212, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.lg, backgroundColor: "#0D47D9", shadowColor: "#123D9A", shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 }, heroTop: { flexDirection: "row", alignItems: "stretch" }, heroCountdown: { flex: 0.9, justifyContent: "center" }, heroDivider: { width: 1, backgroundColor: "rgba(255,255,255,.22)", marginHorizontal: spacing.lg }, heroSubject: { flex: 1.2, justifyContent: "center", gap: 3 }, heroEyebrow: { color: "#DCE8FF", fontSize: 13, fontWeight: "700" }, heroTime: { color: "#FFFFFF", fontSize: 34, lineHeight: 42, fontWeight: "900" }, heroSubjectName: { color: "#FFFFFF", fontSize: 20, lineHeight: 27, fontWeight: "800" }, heroMeta: { color: "#DCE8FF", fontSize: 13 }, heroEmptyTitle: { color: "#FFFFFF", fontSize: 23, lineHeight: 31, fontWeight: "900", marginTop: spacing.lg }, periodBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,.14)" }, periodBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" }, progressLabelRow: { flexDirection: "row", justifyContent: "space-between" }, heroProgressLabel: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" }, heroTrack: { height: 7, backgroundColor: "rgba(255,255,255,.24)", borderRadius: radius.pill, overflow: "hidden", marginTop: 6 }, heroFill: { height: "100%", backgroundColor: "#20D48F", borderRadius: radius.pill }, heroButton: { minHeight: 50, borderRadius: radius.md, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm }, heroButtonText: { color: "#1746C8", fontSize: 16, fontWeight: "800" },
  quickGrid: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 2 }, quickAction: { width: "24%", minHeight: 92, alignItems: "center", justifyContent: "center", gap: 4 }, quickIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" }, quickLabel: { fontSize: 13, fontWeight: "800" }, quickCaption: { fontSize: 10 },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, shadowColor: "#0F172A", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }, sectionTitleRow: { minHeight: 28, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }, sectionTitle: { fontSize: 18, lineHeight: 26, fontWeight: "800", flexShrink: 1 }, sectionAction: { fontSize: 12, fontWeight: "700" }, attendanceBody: { flexDirection: "row", alignItems: "center", gap: spacing.md }, donutWrap: { width: 132, height: 132, alignItems: "center", justifyContent: "center" }, donutCenter: { position: "absolute", alignItems: "center" }, donutValue: { fontSize: 21, fontWeight: "900" }, donutCaption: { fontSize: 11 }, legend: { flex: 1, gap: 7 }, legendRow: { flexDirection: "row", alignItems: "center", gap: 7 }, legendDot: { width: 9, height: 9, borderRadius: 5 }, legendLabel: { flex: 1, fontSize: 12 }, legendValue: { fontSize: 12, fontWeight: "700" },
  listCard: { borderWidth: 1, borderRadius: radius.lg, overflow: "hidden", marginTop: spacing.sm, shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 7, elevation: 1 }, scheduleRow: { minHeight: 58, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm }, scheduleTime: { width: 44, fontSize: 12, fontWeight: "700" }, scheduleMain: { flex: 1, minWidth: 0 }, scheduleSubject: { fontSize: 14, lineHeight: 20, fontWeight: "800" }, scheduleMeta: { fontSize: 11, marginTop: 2 }, scheduleBadge: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 5 }, scheduleBadgeText: { fontSize: 10, fontWeight: "700" }, emptyText: { padding: spacing.xl, textAlign: "center" }, pendingRow: { minHeight: 66, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm }, pendingIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" }, priority: { fontSize: 10, fontWeight: "800" }, pressed: { opacity: 0.72 }, disabled: { opacity: 0.5 },
});
