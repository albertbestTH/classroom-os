import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/ui/icons";
import { AppButton, BottomSheet } from "@/components/ui/primitives";
import { radius, spacing, touchTargets } from "@/constants/tokens";
import { useTheme } from "@/features/theme/theme-context";

type Option = { id: string; label: string };

export function AttendanceScopePicker({
  options,
  value,
  onChange,
}: {
  options: Option[];
  value?: string;
  onChange(value?: string): void;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((option) => option.id === value)?.label ?? "ทุกห้องเรียน";

  const select = (next?: string) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="เลือกห้องเรียนสำหรับภาพรวมการเข้าเรียน"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && styles.pressed,
        ]}
      >
        <Text numberOfLines={1} style={[styles.triggerLabel, { color: colors.text }]}>{selectedLabel}</Text>
        <View style={styles.chevron}><AppIcon name="arrow" color={colors.muted} size={16} /></View>
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>เลือกห้องเรียน</Text>
        <Text style={[styles.description, { color: colors.muted }]}>ข้อมูลในกราฟจะเปลี่ยนเฉพาะห้องที่เลือก</Text>
        <ScrollView style={styles.options} contentContainerStyle={styles.optionContent}>
          {[{ id: "", label: "ทุกห้องเรียน" }, ...options].map((option) => {
            const selected = (value ?? "") === option.id;
            return (
              <Pressable
                key={option.id || "all"}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => select(option.id || undefined)}
                style={({ pressed }) => [
                  styles.option,
                  {
                    backgroundColor: selected ? colors.primarySoft : colors.surface,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.optionLabel, { color: selected ? colors.primaryDark : colors.text }]}>{option.label}</Text>
                {selected ? <View style={[styles.selectedDot, { backgroundColor: colors.primary }]} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
        <AppButton label="ยกเลิก" tone="secondary" onPress={() => setOpen(false)} />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: touchTargets.minimum,
    maxWidth: 150,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  triggerLabel: { flexShrink: 1, fontFamily: "LINESeedSansTHBold", fontSize: 12, fontWeight: "700" },
  chevron: { transform: [{ rotate: "90deg" }] },
  heading: { fontFamily: "LINESeedSansTHBold", fontSize: 20, fontWeight: "800" },
  description: { fontFamily: "LINESeedSansTH", fontSize: 14 },
  options: { maxHeight: 360 },
  optionContent: { gap: spacing.sm },
  option: {
    minHeight: touchTargets.comfortable,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  optionLabel: { flex: 1, fontFamily: "LINESeedSansTHBold", fontSize: 15, fontWeight: "700" },
  selectedDot: { width: 10, height: 10, borderRadius: 5 },
  pressed: { opacity: 0.72 },
});
