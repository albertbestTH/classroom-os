import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useFonts } from "expo-font";
import { Stack, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { TeacherBottomTabs } from "@/components/navigation/teacher-bottom-tabs";
import { AuthProvider, useAuth } from "@/features/auth/auth-context";
import { ThemeProvider, useTheme } from "@/features/theme/theme-context";
import { queryClient } from "@/lib/query-client";
import { persistedQueryOptions } from "@/lib/query-persistence";

function AuthenticatedNavigation() {
  const { state } = useAuth();
  const segments = useSegments();
  const { colors } = useTheme();
  const showTeacherTabs = state === "authenticated" && segments[0] !== "(auth)";

  return <View style={{ flex: 1, backgroundColor: colors.background }}><View style={{ flex: 1 }}><Stack screenOptions={{ headerShown: false }} /></View>{showTeacherTabs ? <TeacherBottomTabs /> : null}</View>;
}

function ThemedApp() {
  const { isDark } = useTheme();
  return <AuthProvider><StatusBar style={isDark ? "light" : "dark"} /><AuthenticatedNavigation /></AuthProvider>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    LINESeedSansTH: require("../assets/fonts/LINESeedSansTH-Regular.ttf"),
    LINESeedSansTHBold: require("../assets/fonts/LINESeedSansTH-Bold.ttf"),
  });
  if (!fontsLoaded) return null;
  return <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaProvider><ThemeProvider><PersistQueryClientProvider client={queryClient} persistOptions={persistedQueryOptions}><ThemedApp /></PersistQueryClientProvider></ThemeProvider></SafeAreaProvider></GestureHandlerRootView>;
}
