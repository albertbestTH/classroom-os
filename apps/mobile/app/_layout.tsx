import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "@/features/auth/auth-context";
import { queryClient } from "@/lib/query-client";
import { persistedQueryOptions } from "@/lib/query-persistence";

export default function RootLayout() {
  return <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaProvider><PersistQueryClientProvider client={queryClient} persistOptions={persistedQueryOptions}><AuthProvider><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false }} /></AuthProvider></PersistQueryClientProvider></SafeAreaProvider></GestureHandlerRootView>;
}
