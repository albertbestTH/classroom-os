import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/features/auth/auth-context";

export default function AuthLayout() {
  const { state } = useAuth();
  if (state === "authenticated") return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
