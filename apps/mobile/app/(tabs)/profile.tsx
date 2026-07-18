import type { TodayTimetableResult } from "@classroom-os/types";
import Constants from "expo-constants";
import { StyleSheet, Text, View } from "react-native";

import { AppButton, AppHeader, Card, SafeScreen, SectionHeader, StatusBadge } from "@/components/ui/primitives";
import { colors, radius, spacing } from "@/constants/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { useAuthenticatedQuery } from "@/hooks/use-authenticated-query";
import { developmentEnvironmentLabel } from "@/lib/environment";

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={styles.detail}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const today = useAuthenticatedQuery<TodayTimetableResult>(["today"], "/api/me/today");
  const environment = developmentEnvironmentLabel();
  const initials = `${user?.firstName?.charAt(0) ?? ""}${user?.lastName?.charAt(0) ?? ""}` || "ครู";

  return <SafeScreen>
    <AppHeader title="โปรไฟล์" subtitle="ข้อมูลบัญชีครูที่กำลังใช้งาน" />
    <Card>
      <View style={styles.identity}>
        <View accessibilityLabel="รูปโปรไฟล์ครูแบบอักษรย่อ" style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View>
        <View style={styles.identityText}><Text style={styles.name}>{user?.firstName} {user?.lastName}</Text><Text style={styles.email}>{user?.email ?? "-"}</Text></View>
        <StatusBadge label="ครูผู้สอน" tone="success" />
      </View>
    </Card>
    <SectionHeader title="ข้อมูลโรงเรียน" />
    <Card>
      <Detail label="โรงเรียน" value={user?.schoolName ?? "-"} />
      <Detail label="รหัสบุคลากร" value={user?.employeeCode ?? "ยังไม่ระบุ"} />
      <Detail label="งานสอน" value={`${user?.assignmentCount ?? 0} รายการ`} />
      <Detail label="ภาคเรียนปัจจุบัน" value={today.data?.currentTerm?.name ?? "ยังไม่กำหนด"} />
    </Card>
    <Card>
      <Text style={styles.noticeTitle}>การแก้ไขข้อมูลบัญชี</Text>
      <Text style={styles.notice}>ชื่อทางการ อีเมล รหัสบุคลากร บทบาท และงานสอนจัดการผ่านเว็บโดยผู้มีสิทธิ์ เพื่อป้องกันข้อมูลโรงเรียนคลาดเคลื่อน</Text>
    </Card>
    <SectionHeader title="เกี่ยวกับแอป" />
    <Card>
      <Detail label="เวอร์ชัน" value={Constants.expoConfig?.version ?? "0.1.0"} />
      {environment ? <Detail label="API สำหรับพัฒนา" value={environment} /> : null}
    </Card>
    <AppButton label="ออกจากระบบ" tone="danger" onPress={() => void logout()} />
  </SafeScreen>;
}

const styles = StyleSheet.create({
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  identityText: { flex: 1 },
  avatar: { width: 56, height: 56, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  initials: { color: colors.primaryDark, fontSize: 19, fontWeight: "900" },
  name: { color: colors.text, fontSize: 18, fontWeight: "800" },
  email: { color: colors.muted, fontSize: 13, marginTop: 3 },
  detail: { gap: 3 },
  label: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  value: { color: colors.text, fontSize: 16, lineHeight: 23 },
  noticeTitle: { color: colors.primaryDark, fontSize: 17, fontWeight: "800" },
  notice: { color: colors.muted, fontSize: 15, lineHeight: 22 },
});
