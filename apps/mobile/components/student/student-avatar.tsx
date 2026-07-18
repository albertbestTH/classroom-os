import { Image, StyleSheet, Text, View } from "react-native";

import { colors, radius } from "@/constants/tokens";

interface StudentAvatarProps {
  firstName: string;
  lastName: string;
  imageUri?: string | null;
  size?: number;
}

export function StudentAvatar({ firstName, lastName, imageUri, size = 48 }: StudentAvatarProps) {
  const initials = `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}` || "นร";
  const dimensions = { width: size, height: size };
  if (imageUri) {
    return <Image accessibilityLabel={`รูปโปรไฟล์ ${firstName} ${lastName}`} source={{ uri: imageUri }} style={[styles.avatar, dimensions]} />;
  }
  return <View accessibilityLabel={`ยังไม่มีรูปโปรไฟล์ ${firstName} ${lastName}`} style={[styles.avatar, styles.fallback, dimensions]}><Text style={styles.initials}>{initials}</Text></View>;
}

const styles = StyleSheet.create({
  avatar: { borderRadius: radius.pill, overflow: "hidden" },
  fallback: { alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: "#BFDBFE" },
  initials: { color: colors.primaryDark, fontSize: 16, fontWeight: "800" },
});
