import type { TeachingAssignmentResult } from "@classroom-os/types";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/ui/icons";
import { EmptyState, ErrorState, LoadingSkeleton, SafeScreen } from "@/components/ui/primitives";
import { radius, spacing, touchTargets } from "@/constants/tokens";
import { useTheme } from "@/features/theme/theme-context";
import { useAuthenticatedQuery } from "@/hooks/use-authenticated-query";
import { queryKeys } from "@/lib/query-keys";

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function AssignmentCard({ assignment, index }: { assignment: TeachingAssignmentResult; index: number }) {
  const { colors } = useTheme();
  const accent = index % 3 === 1
    ? { color: colors.success, soft: colors.successSoft }
    : index % 3 === 2
      ? { color: colors.warning, soft: colors.warningSoft }
      : { color: colors.primary, soft: colors.primarySoft };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`เปิดสมุดคะแนน ${assignment.classroomName} ${assignment.subjectName}`}
      onPress={() => router.push({ pathname: "/gradebook/[assignmentId]", params: { assignmentId: assignment.id } })}
      style={({ pressed }) => [
        styles.assignmentCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderLeftColor: accent.color,
          shadowColor: colors.text,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.subjectIcon, { backgroundColor: accent.soft }]}>
        <AppIcon name="scores" color={accent.color} size={22} />
      </View>
      <View style={styles.assignmentBody}>
        <View style={styles.assignmentTitleRow}>
          <Text numberOfLines={1} style={[styles.subjectName, { color: colors.text }]}>{assignment.subjectName}</Text>
          <View style={[styles.classroomPill, { backgroundColor: accent.soft }]}>
            <Text numberOfLines={1} style={[styles.classroomLabel, { color: accent.color }]}>{assignment.classroomName}</Text>
          </View>
        </View>
        <Text numberOfLines={1} style={[styles.subjectCode, { color: colors.muted }]}>{assignment.subjectCode}</Text>
        <View style={styles.metaRow}>
          <AppIcon name="calendar" color={colors.muted} size={15} />
          <Text numberOfLines={1} style={[styles.metaText, { color: colors.muted }]}>
            {assignment.termName} · {assignment.academicYearName}
          </Text>
        </View>
      </View>
      <View style={[styles.openButton, { backgroundColor: colors.primarySoft }]}>
        <AppIcon name="arrow" color={colors.primary} size={19} />
      </View>
    </Pressable>
  );
}

export function GradebookScreen() {
  const { colors } = useTheme();
  const assignments = useAuthenticatedQuery<TeachingAssignmentResult[]>(queryKeys.assignments, "/api/teaching-assignments");
  if (assignments.isLoading) return <LoadingSkeleton />;
  if (assignments.error || !assignments.data) return <SafeScreen><ErrorState error={assignments.error} onRetry={() => void assignments.refetch()} /></SafeScreen>;

  const sortedAssignments = [...assignments.data].sort((left, right) =>
    left.classroomName.localeCompare(right.classroomName, "th") || left.subjectName.localeCompare(right.subjectName, "th"));
  const classroomCount = new Set(assignments.data.map((assignment) => assignment.classroomId)).size;
  const subjectCount = new Set(assignments.data.map((assignment) => assignment.subjectId)).size;

  return (
    <SafeScreen>
      <View style={[styles.hero, { backgroundColor: colors.primary, shadowColor: colors.primaryDark }]}>
        <View style={styles.heroHeading}>
          <View style={styles.heroIcon}>
            <AppIcon name="scores" color={colors.onPrimary} size={27} />
          </View>
          <View style={styles.heroCopy}>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.onPrimary }]}>สมุดคะแนน</Text>
            <Text style={styles.subtitle}>เลือกชั้นเรียนและรายวิชาเพื่อจัดการคะแนนดิบ</Text>
          </View>
        </View>
        <View style={styles.metricsRow}>
          <Metric value={assignments.data.length} label="งานสอน" />
          <View style={styles.metricDivider} />
          <Metric value={classroomCount} label="ชั้นเรียน" />
          <View style={styles.metricDivider} />
          <Metric value={subjectCount} label="รายวิชา" />
        </View>
      </View>

      {assignments.data.length === 0 ? (
        <EmptyState title="ยังไม่มีงานสอน" description="เมื่อได้รับมอบหมายงานสอน รายวิชาจะปรากฏที่นี่" />
      ) : (
        <View style={styles.assignmentSection}>
          <View style={styles.sectionHeading}>
            <View>
              <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>ชั้นเรียนและรายวิชา</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>เลือกเพื่อดูรายการและกรอกคะแนน</Text>
            </View>
            <View style={[styles.countBadge, { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.countLabel, { color: colors.primaryDark }]}>{assignments.data.length} รายการ</Text>
            </View>
          </View>
          <View style={styles.assignmentList}>
            {sortedAssignments.map((assignment, index) => (
              <AssignmentCard key={assignment.id} assignment={assignment} index={index} />
            ))}
          </View>
        </View>
      )}

      {assignments.data.length > 0 ? (
        <View style={[styles.infoCard, { backgroundColor: colors.primarySoft }]}>
          <View style={[styles.infoIcon, { backgroundColor: colors.surface }]}>
            <AppIcon name="scores" color={colors.primary} size={18} />
          </View>
          <Text style={[styles.infoText, { color: colors.primaryDark }]}>คะแนนด่วนจากแต่ละคาบจะแสดงรวมในสมุดคะแนนเดียวกัน</Text>
        </View>
      ) : null}
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.xl,
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 7,
  },
  heroHeading: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  heroCopy: { flex: 1, gap: 2 },
  title: { fontFamily: "LINESeedSansTHBold", fontSize: 28, lineHeight: 36, fontWeight: "800" },
  subtitle: { fontFamily: "LINESeedSansTH", color: "rgba(255,255,255,0.82)", fontSize: 13, lineHeight: 19 },
  metricsRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.13)",
    paddingVertical: spacing.sm,
  },
  metric: { flex: 1, alignItems: "center", justifyContent: "center" },
  metricValue: { fontFamily: "LINESeedSansTHBold", color: "#FFFFFF", fontSize: 23, lineHeight: 28, fontWeight: "800" },
  metricLabel: { fontFamily: "LINESeedSansTH", color: "rgba(255,255,255,0.78)", fontSize: 12 },
  metricDivider: { width: 1, height: 34, backgroundColor: "rgba(255,255,255,0.22)" },
  assignmentSection: { gap: spacing.md },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  sectionTitle: { fontFamily: "LINESeedSansTHBold", fontSize: 20, lineHeight: 28, fontWeight: "800" },
  sectionSubtitle: { fontFamily: "LINESeedSansTH", fontSize: 13, marginTop: 1 },
  countBadge: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  countLabel: { fontFamily: "LINESeedSansTHBold", fontSize: 12, fontWeight: "700" },
  assignmentList: { gap: spacing.md },
  assignmentCard: {
    minHeight: 120,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowOpacity: 0.09,
    shadowRadius: 9,
    elevation: 3,
  },
  subjectIcon: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  assignmentBody: { flex: 1, minWidth: 0, gap: 3 },
  assignmentTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  subjectName: { flex: 1, fontFamily: "LINESeedSansTHBold", fontSize: 17, lineHeight: 24, fontWeight: "800" },
  classroomPill: { maxWidth: "42%", borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  classroomLabel: { fontFamily: "LINESeedSansTHBold", fontSize: 11, fontWeight: "700" },
  subjectCode: { fontFamily: "LINESeedSansTH", fontSize: 12 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  metaText: { flex: 1, fontFamily: "LINESeedSansTH", fontSize: 12 },
  openButton: {
    width: touchTargets.minimum,
    height: touchTargets.minimum,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderRadius: radius.lg, padding: spacing.lg },
  infoIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  infoText: { flex: 1, fontFamily: "LINESeedSansTH", fontSize: 13, lineHeight: 19 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
});
