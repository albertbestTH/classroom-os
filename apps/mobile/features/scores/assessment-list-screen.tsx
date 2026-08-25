import type { GradebookAssessmentResult, GradebookResult } from "@classroom-os/types";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/ui/icons";
import { EmptyState, ErrorState, LoadingSkeleton, SafeScreen } from "@/components/ui/primitives";
import { radius, spacing, touchTargets } from "@/constants/tokens";
import { useTheme } from "@/features/theme/theme-context";
import { useAuthenticatedQuery } from "@/hooks/use-authenticated-query";
import { queryKeys } from "@/lib/query-keys";

function formatAssessmentDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" })
    .format(new Date(`${value}T00:00:00+07:00`));
}

function HeroMetric({ value, label }: { value: number; label: string }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function AssessmentCard({
  assessment,
  categoryName,
  categoryIndex,
  studentCount,
  teachingAssignmentId,
}: {
  assessment: GradebookAssessmentResult;
  categoryName: string;
  categoryIndex: number;
  studentCount: number;
  teachingAssignmentId: string;
}) {
  const { colors } = useTheme();
  const accent = categoryIndex % 3 === 1
    ? { color: colors.success, soft: colors.successSoft }
    : categoryIndex % 3 === 2
      ? { color: colors.warning, soft: colors.warningSoft }
      : { color: colors.primary, soft: colors.primarySoft };
  const completion = studentCount > 0 ? Math.min(100, Math.round((assessment.scoreCount / studentCount) * 100)) : 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`กรอกคะแนน ${assessment.title} คะแนนเต็ม ${assessment.maxScore}`}
      onPress={() => router.push({ pathname: "/gradebook/[assignmentId]/[assessmentId]", params: { assignmentId: teachingAssignmentId, assessmentId: assessment.id } })}
      style={({ pressed }) => [
        styles.assessmentCard,
        { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: accent.color, shadowColor: colors.text },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.assessmentTopRow}>
        <View style={[styles.assessmentIcon, { backgroundColor: accent.soft }]}>
          <AppIcon name="scores" color={accent.color} size={21} />
        </View>
        <View style={styles.assessmentHeading}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={[styles.assessmentTitle, { color: colors.text }]}>{assessment.title}</Text>
            {assessment.classSessionId ? (
              <View style={[styles.quickBadge, { backgroundColor: colors.infoSoft }]}>
                <Text style={[styles.quickBadgeText, { color: colors.primaryDark }]}>คะแนนด่วน</Text>
              </View>
            ) : null}
          </View>
          <Text numberOfLines={1} style={[styles.categoryName, { color: accent.color }]}>{categoryName}</Text>
        </View>
        <View style={[styles.openButton, { backgroundColor: colors.primarySoft }]}>
          <AppIcon name="arrow" color={colors.primary} size={18} />
        </View>
      </View>

      <View style={styles.assessmentMeta}>
        <View style={styles.metaItem}>
          <AppIcon name="calendar" color={colors.muted} size={15} />
          <Text style={[styles.metaText, { color: colors.muted }]}>{formatAssessmentDate(assessment.assessmentDate)}</Text>
        </View>
        <View style={[styles.maxScoreBadge, { backgroundColor: accent.soft }]}>
          <Text style={[styles.maxScoreText, { color: accent.color }]}>เต็ม {assessment.maxScore}</Text>
        </View>
      </View>

      <View style={styles.progressArea}>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressLabel, { color: colors.muted }]}>กรอกแล้ว {assessment.scoreCount}/{studentCount} คน</Text>
          <Text style={[styles.progressValue, { color: accent.color }]}>{completion}%</Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, { width: `${completion}%`, backgroundColor: accent.color }]} />
        </View>
      </View>
    </Pressable>
  );
}

export function AssessmentListScreen({ teachingAssignmentId }: { teachingAssignmentId: string }) {
  const { colors } = useTheme();
  const gradebook = useAuthenticatedQuery<GradebookResult>(queryKeys.gradebook(teachingAssignmentId), `/api/assessments?teachingAssignmentId=${encodeURIComponent(teachingAssignmentId)}`, Boolean(teachingAssignmentId));
  if (gradebook.isLoading) return <LoadingSkeleton />;
  if (gradebook.error || !gradebook.data) return <SafeScreen><ErrorState error={gradebook.error} onRetry={() => void gradebook.refetch()} /></SafeScreen>;

  const data = gradebook.data;
  const categoryIndex = new Map(data.categories.map((category, index) => [category.id, index]));
  const categoryName = new Map(data.categories.map((category) => [category.id, category.name]));

  return (
    <SafeScreen>
      <View style={[styles.hero, { backgroundColor: colors.primary, shadowColor: colors.primaryDark }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="กลับไปสมุดคะแนน"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <View style={styles.backIcon}><AppIcon name="arrow" color={colors.onPrimary} size={17} /></View>
          <Text style={[styles.backLabel, { color: colors.onPrimary }]}>สมุดคะแนน</Text>
        </Pressable>

        <View style={styles.heroIdentity}>
          <View style={styles.heroIcon}><AppIcon name="scores" color={colors.onPrimary} size={26} /></View>
          <View style={styles.heroCopy}>
            <View style={styles.classroomBadge}><Text style={styles.classroomBadgeText}>{data.teachingContext.classroomName}</Text></View>
            <Text accessibilityRole="header" style={[styles.heroTitle, { color: colors.onPrimary }]}>{data.teachingContext.subjectName}</Text>
            <Text style={styles.heroSubtitle}>{data.teachingContext.termName} · ปีการศึกษา {data.teachingContext.academicYearName}</Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <HeroMetric value={data.assessments.length} label="รายการคะแนน" />
          <View style={styles.metricDivider} />
          <HeroMetric value={data.categories.length} label="หมวดคะแนน" />
          <View style={styles.metricDivider} />
          <HeroMetric value={data.students.length} label="นักเรียน" />
        </View>
      </View>

      {data.assessments.length === 0 ? (
        <EmptyState title="ยังไม่มีรายการคะแนน" description="สร้างหมวดและรายการคะแนนจากเว็บก่อน แล้วจึงกรอกคะแนนบนแอป" />
      ) : (
        <View style={styles.listSection}>
          <View style={styles.sectionHeading}>
            <View>
              <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>รายการคะแนน</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>เลือกเพื่อกรอกหรือแก้ไขคะแนนดิบ</Text>
            </View>
            <View style={[styles.countBadge, { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.countLabel, { color: colors.primaryDark }]}>{data.assessments.length} รายการ</Text>
            </View>
          </View>
          <View style={styles.assessmentList}>
            {data.assessments.map((assessment) => (
              <AssessmentCard
                key={assessment.id}
                assessment={assessment}
                categoryName={categoryName.get(assessment.categoryId) ?? "ไม่ระบุหมวด"}
                categoryIndex={categoryIndex.get(assessment.categoryId) ?? 0}
                studentCount={data.students.length}
                teachingAssignmentId={teachingAssignmentId}
              />
            ))}
          </View>
        </View>
      )}

      <View style={[styles.infoCard, { backgroundColor: colors.primarySoft }]}>
        <View style={[styles.infoIcon, { backgroundColor: colors.surface }]}><AppIcon name="scores" color={colors.primary} size={18} /></View>
        <Text style={[styles.infoText, { color: colors.primaryDark }]}>ช่องว่างหมายถึงยังไม่กรอก และ 0 หมายถึงได้ศูนย์จริง</Text>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: spacing.xl, gap: spacing.lg, shadowOpacity: 0.24, shadowRadius: 14, elevation: 7 },
  backButton: { minHeight: touchTargets.minimum, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingRight: spacing.md },
  backIcon: { width: 32, height: 32, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.16)", transform: [{ rotate: "180deg" }] },
  backLabel: { fontFamily: "LINESeedSansTHBold", fontSize: 14, fontWeight: "700" },
  heroIdentity: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  heroIcon: { width: 54, height: 54, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.16)" },
  heroCopy: { flex: 1, minWidth: 0 },
  classroomBadge: { alignSelf: "flex-start", borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.16)", paddingHorizontal: 10, paddingVertical: 4, marginBottom: 3 },
  classroomBadgeText: { fontFamily: "LINESeedSansTHBold", color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  heroTitle: { fontFamily: "LINESeedSansTHBold", fontSize: 25, lineHeight: 32, fontWeight: "800" },
  heroSubtitle: { fontFamily: "LINESeedSansTH", color: "rgba(255,255,255,0.8)", fontSize: 12, lineHeight: 18 },
  metricsRow: { minHeight: 64, flexDirection: "row", alignItems: "center", borderRadius: radius.lg, backgroundColor: "rgba(255,255,255,0.13)", paddingVertical: spacing.sm },
  metric: { flex: 1, alignItems: "center", justifyContent: "center" },
  metricValue: { fontFamily: "LINESeedSansTHBold", color: "#FFFFFF", fontSize: 22, lineHeight: 27, fontWeight: "800" },
  metricLabel: { fontFamily: "LINESeedSansTH", color: "rgba(255,255,255,0.78)", fontSize: 11 },
  metricDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.22)" },
  listSection: { gap: spacing.md },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  sectionTitle: { fontFamily: "LINESeedSansTHBold", fontSize: 20, lineHeight: 28, fontWeight: "800" },
  sectionSubtitle: { fontFamily: "LINESeedSansTH", fontSize: 13, marginTop: 1 },
  countBadge: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  countLabel: { fontFamily: "LINESeedSansTHBold", fontSize: 12, fontWeight: "700" },
  assessmentList: { gap: spacing.md },
  assessmentCard: { borderWidth: 1, borderLeftWidth: 4, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, shadowOpacity: 0.09, shadowRadius: 9, elevation: 3 },
  assessmentTopRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  assessmentIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  assessmentHeading: { flex: 1, minWidth: 0, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  assessmentTitle: { flex: 1, fontFamily: "LINESeedSansTHBold", fontSize: 17, lineHeight: 24, fontWeight: "800" },
  categoryName: { fontFamily: "LINESeedSansTHBold", fontSize: 12, fontWeight: "700" },
  quickBadge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  quickBadgeText: { fontFamily: "LINESeedSansTHBold", fontSize: 10, fontWeight: "700" },
  openButton: { width: touchTargets.minimum, height: touchTargets.minimum, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  assessmentMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  metaItem: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontFamily: "LINESeedSansTH", fontSize: 12 },
  maxScoreBadge: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  maxScoreText: { fontFamily: "LINESeedSansTHBold", fontSize: 11, fontWeight: "700" },
  progressArea: { gap: 6 },
  progressLabels: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  progressLabel: { fontFamily: "LINESeedSansTH", fontSize: 11 },
  progressValue: { fontFamily: "LINESeedSansTHBold", fontSize: 11, fontWeight: "700" },
  progressTrack: { height: 6, overflow: "hidden", borderRadius: radius.pill },
  progressFill: { height: "100%", borderRadius: radius.pill },
  infoCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderRadius: radius.lg, padding: spacing.lg },
  infoIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  infoText: { flex: 1, fontFamily: "LINESeedSansTH", fontSize: 13, lineHeight: 19 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
});
