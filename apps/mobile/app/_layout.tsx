import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "@/features/auth/auth-context";
import { ThemeProvider, useTheme } from "@/features/theme/theme-context";
import { queryClient } from "@/lib/query-client";
import { persistedQueryOptions } from "@/lib/query-persistence";

function ThemedApp() {
  const { isDark } = useTheme();
  return <AuthProvider><StatusBar style={isDark ? "light" : "dark"} /><Stack screenOptions={{ headerShown: false }} /></AuthProvider>;
}

export default function RootLayout() {
  return <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaProvider><ThemeProvider><PersistQueryClientProvider client={queryClient} persistOptions={persistedQueryOptions}><ThemedApp /></PersistQueryClientProvider></ThemeProvider></SafeAreaProvider></GestureHandlerRootView>;
}
