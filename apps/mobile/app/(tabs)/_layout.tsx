import { Redirect, Tabs } from "expo-router";
import { type ColorValue } from "react-native";

import { AppIcon } from "@/components/ui/icons";
import { useAuth } from "@/features/auth/auth-context";
import { useTheme } from "@/features/theme/theme-context";

type TabIconProps = { color: ColorValue };
function TodayIcon({ color }: TabIconProps) { return <AppIcon name="today" color={String(color)} />; }
function TimetableIcon({ color }: TabIconProps) { return <AppIcon name="calendar" color={String(color)} />; }
function ScoresIcon({ color }: TabIconProps) { return <AppIcon name="scores" color={String(color)} />; }
function ProfileIcon({ color }: TabIconProps) { return <AppIcon name="profile" color={String(color)} />; }

export default function TabLayout() {
  const { state } = useAuth();
  const { colors } = useTheme();
  if (state === "unauthenticated") return <Redirect href="/(auth)/login" />;

  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, tabBarStyle: { minHeight: 64, paddingTop: 6, backgroundColor: colors.surface, borderTopColor: colors.border }, tabBarLabelStyle: { fontFamily: "LINESeedSansTH", fontSize: 12, fontWeight: "600" } }}>
    <Tabs.Screen name="index" options={{ title: "วันนี้", tabBarIcon: TodayIcon }} />
    <Tabs.Screen name="classes" options={{ title: "ตารางสอน", tabBarIcon: TimetableIcon }} />
    <Tabs.Screen name="live" options={{ href: null }} />
    <Tabs.Screen name="scores" options={{ href: null, title: "บันทึก", tabBarIcon: ScoresIcon }} />
    <Tabs.Screen name="profile" options={{ title: "โปรไฟล์", tabBarIcon: ProfileIcon }} />
  </Tabs>;
}
