import { router, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcon, type AppIconName } from "@/components/ui/icons";
import { spacing, touchTargets } from "@/constants/tokens";
import { activeTeacherTab, type TeacherTabKey } from "@/features/navigation/teacher-tab-routes";
import { useTheme } from "@/features/theme/theme-context";

const tabs: { key: TeacherTabKey; label: string; icon: AppIconName; href: string }[] = [
  { key: "today", label: "วันนี้", icon: "today", href: "/(tabs)" },
  { key: "timetable", label: "ตารางสอน", icon: "calendar", href: "/(tabs)/classes" },
  { key: "scores", label: "คะแนน", icon: "scores", href: "/(tabs)/scores" },
  { key: "profile", label: "โปรไฟล์", icon: "profile", href: "/(tabs)/profile" },
];

export function TeacherBottomTabs() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const active = activeTeacherTab(pathname);

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, spacing.xs),
        },
      ]}
    >
      {tabs.map((tab) => {
        const selected = active === tab.key;
        const color = selected ? colors.primary : colors.muted;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            onPress={() => router.replace(tab.href as never)}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <AppIcon name={tab.icon} color={color} size={21} />
            <Text style={[styles.label, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "flex-start",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.xs,
  },
  tab: {
    flex: 1,
    minWidth: touchTargets.minimum,
    minHeight: touchTargets.comfortable,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  label: { fontFamily: "LINESeedSansTHBold", fontSize: 12, fontWeight: "700" },
  pressed: { opacity: 0.65 },
});
