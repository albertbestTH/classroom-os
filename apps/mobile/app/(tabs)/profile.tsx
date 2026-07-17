import type { TodayTimetableResult } from "@classroom-os/types";
import Constants from "expo-constants";
import { StyleSheet, Text } from "react-native";

import { AppButton, AppHeader, Card, SafeScreen } from "@/components/ui/primitives";
import { colors, spacing } from "@/constants/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { useAuthenticatedQuery } from "@/hooks/use-authenticated-query";
import { developmentEnvironmentLabel } from "@/lib/environment";

function Detail({ label, value }: { label: string; value: string }) { return <Text style={styles.value}><Text style={styles.label}>{label}: </Text>{value}</Text>; }
export default function ProfileScreen() { const { user, logout } = useAuth(); const today = useAuthenticatedQuery<TodayTimetableResult>(["today"], "/api/me/today"); const environment = developmentEnvironmentLabel(); return <SafeScreen><AppHeader title="โปรไฟล์" subtitle="บัญชีครูที่กำลังใช้งาน" /><Card><Detail label="ชื่อ" value={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`} /><Detail label="อีเมล" value={user?.email ?? "-"} /><Detail label="โรงเรียน" value={user?.schoolName ?? "-"} /><Detail label="บทบาท" value="ครูผู้สอน" /><Detail label="รหัสบุคลากร" value={user?.employeeCode ?? "ยังไม่ระบุ"} /><Detail label="งานสอน" value={`${user?.assignmentCount ?? 0} รายการ`} /><Detail label="ภาคเรียนปัจจุบัน" value={today.data?.currentTerm?.name ?? "ยังไม่กำหนด"} /><Detail label="เวอร์ชันแอป" value={Constants.expoConfig?.version ?? "0.1.0"} />{environment ? <Detail label="API สำหรับพัฒนา" value={environment} /> : null}</Card><AppButton label="ออกจากระบบ" tone="danger" onPress={() => void logout()} /></SafeScreen>; }
const styles = StyleSheet.create({ value: { color: colors.text, fontSize: 16, lineHeight: 25 }, label: { color: colors.muted, fontWeight: "700" }, gap: { gap: spacing.md } });
