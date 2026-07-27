import { formatAttendancePercentage, type AttendanceSummary } from "@classroom-os/types";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

import { Card, ProgressBar, ThemedText } from "@/components/ui/primitives";
import { spacing } from "@/constants/tokens";
import { useTheme } from "@/features/theme/theme-context";

const SIZE = 144;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = Math.PI * 2 * RADIUS;

export function AttendanceSummaryCard({ summary }: { summary: AttendanceSummary }) {
  const { colors } = useTheme();
  const statuses = [
    { key: "present", label: "มา", count: summary.present, percentage: summary.presentPercentage, color: colors.success },
    { key: "late", label: "สาย", count: summary.late, percentage: summary.latePercentage, color: colors.warning },
    { key: "leave", label: "ลา", count: summary.leave, percentage: summary.leavePercentage, color: colors.primary },
    { key: "absent", label: "ขาด", count: summary.absent, percentage: summary.absentPercentage, color: colors.danger },
    { key: "unrecorded", label: "ยังไม่บันทึก", count: summary.unrecorded, percentage: summary.unrecordedPercentage, color: colors.muted },
  ].filter((status) => status.count > 0 || status.key !== "unrecorded");
  const accessibilityLabel = `นักเรียนทั้งหมด ${summary.enrolled} คน ${statuses.map((status) => `${status.label} ${status.count} คน ร้อยละ ${status.percentage}`).join(" ")} บันทึกเช็กชื่อ ${summary.recorded} จาก ${summary.enrolled} คน`;
  let offset = 0;

  return <Card>
    <ThemedText accessibilityRole="header" style={styles.heading}>ภาพรวมการเข้าเรียน</ThemedText>
    {summary.enrolled === 0 ? <View accessible accessibilityLabel="ไม่มีนักเรียนในชั้นเรียน" style={[styles.empty, { backgroundColor: colors.primarySoft }]}><ThemedText style={styles.emptyTitle}>ยังไม่มีนักเรียนในชั้นเรียน</ThemedText><ThemedText tone="muted">ไม่มีข้อมูลสำหรับแสดงสัดส่วนการเข้าเรียน</ThemedText></View> : <View accessible accessibilityLabel={accessibilityLabel} style={styles.dashboard}>
      <View style={styles.donutWrap}>
        <Svg width={SIZE} height={SIZE} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <G rotation="-90" origin={`${SIZE / 2}, ${SIZE / 2}`}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={colors.border} strokeWidth={STROKE} fill="none" />
            {statuses.map((status) => {
              const length = status.percentage / 100 * CIRCUMFERENCE;
              const currentOffset = offset;
              offset += length;
              return <Circle key={status.key} cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={status.color} strokeWidth={STROKE} fill="none" strokeDasharray={`${length} ${CIRCUMFERENCE - length}`} strokeDashoffset={-currentOffset} />;
            })}
          </G>
        </Svg>
        <View pointerEvents="none" style={styles.center}><ThemedText style={styles.centerValue}>{summary.enrolled}</ThemedText><ThemedText tone="muted" style={styles.centerLabel}>นักเรียนทั้งหมด</ThemedText></View>
      </View>
      <View style={styles.legend}>{statuses.map((status) => <View key={status.key} style={styles.row}><View style={[styles.marker, { backgroundColor: status.color }]} /><ThemedText style={styles.label}>{status.label}</ThemedText><ThemedText style={styles.count}>{status.count} คน</ThemedText><ThemedText tone="muted" style={styles.percentage}>{formatAttendancePercentage(status.percentage)}</ThemedText></View>)}</View>
    </View>}
    <ThemedText style={styles.completion}>บันทึกเช็กชื่อแล้ว {summary.recorded}/{summary.enrolled} คน</ThemedText>
    <ProgressBar label="ความคืบหน้าการบันทึกเช็กชื่อ" value={summary.recorded} max={summary.enrolled} tone={summary.enrolled > 0 && summary.recorded === summary.enrolled ? "success" : "warning"} />
  </Card>;
}

const styles = StyleSheet.create({
  heading: { fontSize: 18, fontWeight: "800" },
  dashboard: { gap: spacing.lg, alignItems: "center" },
  donutWrap: { width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" },
  center: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center" },
  centerValue: { fontSize: 30, fontWeight: "900", fontVariant: ["tabular-nums"] },
  centerLabel: { fontSize: 11, textAlign: "center" },
  legend: { alignSelf: "stretch", gap: spacing.sm },
  row: { minHeight: 36, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  marker: { width: 10, height: 10, borderRadius: 5 },
  label: { flex: 1, fontWeight: "700" },
  count: { minWidth: 52, textAlign: "right", fontWeight: "700", fontVariant: ["tabular-nums"] },
  percentage: { minWidth: 48, textAlign: "right", fontVariant: ["tabular-nums"] },
  completion: { fontWeight: "700" },
  empty: { borderRadius: 16, padding: spacing.lg, gap: spacing.xs },
  emptyTitle: { fontWeight: "800" },
});
