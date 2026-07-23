import type { CurrentUserResult, TeachingAssignmentResult, TodayTimetableResult } from "@classroom-os/types";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton, AppHeader, Avatar, Card, Chip, FormField, ListTile, OfflineBanner, SafeScreen, SectionHeader, StatusBadge, ThemedText } from "@/components/ui/primitives";
import { spacing } from "@/constants/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { useTheme, type ThemePreference } from "@/features/theme/theme-context";
import { useAuthenticatedQuery } from "@/hooks/use-authenticated-query";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { apiRequest } from "@/lib/api-client";
import { thaiErrorMessage } from "@/lib/api-error";
import { developmentEnvironmentLabel } from "@/lib/environment";

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={styles.detail}><ThemedText tone="muted" style={styles.label}>{label}</ThemedText><ThemedText style={styles.value}>{value}</ThemedText></View>;
}

export default function ProfileScreen() {
  const { user, token, updateUser, logout } = useAuth();
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();
  const { preference, setPreference } = useTheme();
  const profile = useAuthenticatedQuery<CurrentUserResult>(["profile"], "/api/profile");
  const assignments = useAuthenticatedQuery<TeachingAssignmentResult[]>(["assignments"], "/api/teaching-assignments");
  const today = useAuthenticatedQuery<TodayTimetableResult>(["today"], "/api/me/today");
  const current = profile.data ?? user;
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? "");
  const [profileMessage, setProfileMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const environment = developmentEnvironmentLabel();

  async function saveProfile() {
    setSaving(true); setProfileMessage("");
    try {
      const updated = await apiRequest<CurrentUserResult>("/api/profile", { method: "PATCH", token, body: { firstName, lastName, phoneNumber: phoneNumber || null } });
      updateUser(updated); queryClient.setQueryData(["profile"], updated); setProfileMessage("บันทึกโปรไฟล์แล้ว");
    } catch (error) { setProfileMessage(thaiErrorMessage(error)); }
    finally { setSaving(false); }
  }

  const updatedTimes = [profile.dataUpdatedAt, assignments.dataUpdatedAt, today.dataUpdatedAt].filter((value) => value > 0);
  return <SafeScreen>
    <OfflineBanner visible={!isOnline} lastUpdated={updatedTimes.length ? Math.min(...updatedTimes) : undefined} />
    <AppHeader title="โปรไฟล์" subtitle="ข้อมูลบัญชีครูที่กำลังใช้งาน" />
    <Card><View style={styles.identity}><Avatar label={`${current?.firstName ?? ""} ${current?.lastName ?? ""}`} size={56} /><View style={styles.identityText}><ThemedText style={styles.name}>{current?.firstName} {current?.lastName}</ThemedText><ThemedText tone="muted" style={styles.email}>{current?.email ?? "-"}</ThemedText></View><StatusBadge label="ครูผู้สอน" tone="success" /></View></Card>
    <SectionHeader title="บริบทปัจจุบัน" />
    <Card><Detail label="โรงเรียน" value={current?.schoolName ?? "-"} /><Detail label="รหัสบุคลากร" value={current?.employeeCode ?? "ยังไม่ระบุ"} /><Detail label="ปีการศึกษา" value={today.data?.currentAcademicYear?.name ?? "ยังไม่กำหนด"} /><Detail label="ภาคเรียน" value={today.data?.currentTerm?.name ?? "ยังไม่กำหนด"} /></Card>
    <SectionHeader title="งานสอนของฉัน" action={<StatusBadge label={`${assignments.data?.length ?? current?.assignmentCount ?? 0} รายการ`} />}/>
    <Card>{assignments.data?.length ? assignments.data.map((item) => <ListTile key={item.id} title={`${item.classroomName} · ${item.subjectName}`} subtitle={`${item.academicYearName} · ${item.termName}`} onPress={() => router.push(`/classes/${item.id}`)} />) : <ThemedText tone="muted">ยังไม่มีงานสอนในบัญชีนี้</ThemedText>}</Card>
    <SectionHeader title="แก้ไขข้อมูลส่วนตัว" />
    <Card>
      <FormField label="ชื่อ" value={firstName} onChangeText={setFirstName} /><FormField label="นามสกุล" value={lastName} onChangeText={setLastName} /><FormField label="เบอร์โทรศัพท์" keyboardType="phone-pad" value={phoneNumber} onChangeText={setPhoneNumber} />
      {profileMessage ? <ThemedText accessibilityRole="alert" tone="primary" style={styles.feedback}>{profileMessage}</ThemedText> : null}
      <AppButton label={saving ? "กำลังบันทึก…" : "บันทึกโปรไฟล์"} disabled={!isOnline || saving || !firstName.trim() || !lastName.trim()} accessibilityHint={!isOnline ? "ต้องเชื่อมต่ออินเทอร์เน็ตก่อนบันทึก" : undefined} onPress={() => void saveProfile()} />
      <ThemedText tone="muted" style={styles.notice}>การเปลี่ยนอีเมลต้องยืนยันรหัสผ่านและอีเมลใหม่ จัดการได้ที่หน้าโปรไฟล์บนเว็บ</ThemedText>
    </Card>
    <SectionHeader title="ธีม" />
    <View accessibilityRole="radiogroup" style={styles.themeOptions}>{([['system', 'ตามระบบ'], ['light', 'สว่าง'], ['dark', 'มืด']] as const).map(([value, label]) => <Chip key={value} label={label} selected={preference === value} accessibilityLabel={`ธีม${label}`} onPress={() => void setPreference(value as ThemePreference)} />)}</View>
    <SectionHeader title="เกี่ยวกับแอป" />
    <Card><Detail label="เวอร์ชัน" value={Constants.expoConfig?.version ?? "0.1.0"} />{environment ? <Detail label="สภาพแวดล้อม API" value={environment} /> : null}<ListTile title="โอเพนซอร์สไลเซนส์" subtitle="แพ็กเกจที่ใช้ใน Classroom OS" onPress={() => router.push("/licenses" as never)} /></Card>
    <AppButton label="ออกจากระบบ" tone="danger" onPress={() => void logout()} />
  </SafeScreen>;
}

const styles = StyleSheet.create({ identity: { flexDirection: "row", alignItems: "center", gap: spacing.md }, identityText: { flex: 1 }, name: { fontSize: 18, fontWeight: "800" }, email: { fontSize: 13, marginTop: 3 }, detail: { gap: 3 }, label: { fontSize: 13, fontWeight: "700" }, value: { fontSize: 16, lineHeight: 23 }, notice: { fontSize: 15, lineHeight: 22 }, feedback: { fontSize: 14, fontWeight: "700" }, themeOptions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm } });
