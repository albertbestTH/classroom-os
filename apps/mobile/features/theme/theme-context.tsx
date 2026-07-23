import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { AccessibilityInfo, useColorScheme } from "react-native";

import { darkColors, lightColors, type ThemeColors } from "@/constants/tokens";

export type ThemePreference = "system" | "light" | "dark";
const THEME_KEY = "classroom-os:theme";

type ThemeContextValue = { colors: ThemeColors; isDark: boolean; reduceMotion: boolean; preference: ThemePreference; setPreference(value: ThemePreference): Promise<void> };
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function resolveTheme(preference: ThemePreference, system: string | null | undefined): "light" | "dark" {
  return preference === "system" ? (system === "dark" ? "dark" : "light") : preference;
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => { void AsyncStorage.getItem(THEME_KEY).then((value) => { if (value === "system" || value === "light" || value === "dark") setPreferenceState(value); }); }, []);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => listener.remove();
  }, []);
  const resolved = resolveTheme(preference, system);
  const value = useMemo<ThemeContextValue>(() => ({
    colors: resolved === "dark" ? darkColors : lightColors, isDark: resolved === "dark", reduceMotion, preference,
    async setPreference(next) { setPreferenceState(next); await AsyncStorage.setItem(THEME_KEY, next); },
  }), [preference, reduceMotion, resolved]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}
