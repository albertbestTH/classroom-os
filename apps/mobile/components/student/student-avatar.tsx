import { Image, StyleSheet, Text, View } from "react-native";

import { radius } from "@/constants/tokens";
import { useTheme } from "@/features/theme/theme-context";

interface StudentAvatarProps {
  firstName: string;
  lastName: string;
  imageUri?: string | null;
  size?: number;
}

export function StudentAvatar({ firstName, lastName, imageUri, size = 48 }: StudentAvatarProps) {
  const { colors } = useTheme();
  const initials = `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}` || "นร";
  const dimensions = { width: size, height: size };
  if (imageUri) {
    return <Image accessibilityLabel={`รูปโปรไฟล์ ${firstName} ${lastName}`} source={{ uri: imageUri }} style={[styles.avatar, dimensions]} />;
  }
  return <View accessibilityRole="image" accessibilityLabel={`ยังไม่มีรูปโปรไฟล์ ${firstName} ${lastName}`} style={[styles.avatar, styles.fallback, { backgroundColor: colors.primarySoft, borderColor: colors.primary }, dimensions]}><Text style={[styles.initials, { color: colors.primaryDark }]}>{initials}</Text></View>;
}

const styles = StyleSheet.create({
  avatar: { borderRadius: radius.pill, overflow: "hidden" },
  fallback: { alignItems: "center", justifyContent: "center", borderWidth: 1 },
  initials: { fontSize: 16, fontWeight: "800" },
});
