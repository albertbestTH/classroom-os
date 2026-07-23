import { Redirect, Tabs } from "expo-router";
import { Text, type ColorValue } from "react-native";

import { useAuth } from "@/features/auth/auth-context";
import { useTheme } from "@/features/theme/theme-context";

type TabIconProps = { color: ColorValue };
const TodayIcon = ({ color }: TabIconProps) => <Text style={{ color, fontSize: 20 }}>◉</Text>;
const TimetableIcon = ({ color }: TabIconProps) => <Text style={{ color, fontSize: 20 }}>▦</Text>;
const ScoresIcon = ({ color }: TabIconProps) => <Text style={{ color, fontSize: 20 }}>✓</Text>;
const ProfileIcon = ({ color }: TabIconProps) => <Text style={{ color, fontSize: 20 }}>○</Text>;

export default function TabLayout() {
  const { state } = useAuth();
  const { colors } = useTheme();
  if (state === "unauthenticated") return <Redirect href="/(auth)/login" />;

  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, tabBarStyle: { minHeight: 64, paddingTop: 6, backgroundColor: colors.surface, borderTopColor: colors.border }, tabBarLabelStyle: { fontSize: 12, fontWeight: "600" } }}>
    <Tabs.Screen name="index" options={{ title: "วันนี้", tabBarIcon: TodayIcon }} />
    <Tabs.Screen name="classes" options={{ title: "ตารางสอน", tabBarIcon: TimetableIcon }} />
    <Tabs.Screen name="live" options={{ href: null }} />
    <Tabs.Screen name="scores" options={{ title: "บันทึก", tabBarIcon: ScoresIcon }} />
    <Tabs.Screen name="profile" options={{ title: "โปรไฟล์", tabBarIcon: ProfileIcon }} />
  </Tabs>;
}
