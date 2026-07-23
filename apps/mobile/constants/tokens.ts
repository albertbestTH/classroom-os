export const lightColors = {
  primary: "#2563EB", primaryDark: "#1D4ED8", primarySoft: "#EFF6FF",
  success: "#15803D", successSoft: "#DCFCE7", warning: "#B45309", warningSoft: "#FEF3C7",
  danger: "#B91C1C", dangerSoft: "#FEE2E2", infoSoft: "#DBEAFE",
  background: "#F7F8FA", surface: "#FFFFFF", surfaceRaised: "#FFFFFF", text: "#111827",
  muted: "#6B7280", border: "#E5E7EB", overlay: "rgba(17,24,39,0.60)", onPrimary: "#FFFFFF",
} as const;

export const darkColors = {
  primary: "#60A5FA", primaryDark: "#93C5FD", primarySoft: "#172554",
  success: "#4ADE80", successSoft: "#052E16", warning: "#FBBF24", warningSoft: "#451A03",
  danger: "#F87171", dangerSoft: "#450A0A", infoSoft: "#172554",
  background: "#030712", surface: "#111827", surfaceRaised: "#1F2937", text: "#F9FAFB",
  muted: "#D1D5DB", border: "#374151", overlay: "rgba(0,0,0,0.72)", onPrimary: "#08101F",
} as const;

export type ThemeColors = { [K in keyof typeof lightColors]: string };
/** Light palette compatibility export. New UI should use useTheme().colors. */
export const colors = lightColors;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 40 } as const;
export const radius = { sm: 8, md: 12, lg: 18, xl: 24, pill: 999 } as const;
export const typography = {
  caption: { fontSize: 13, lineHeight: 18 }, body: { fontSize: 16, lineHeight: 24 },
  subtitle: { fontSize: 18, lineHeight: 26 }, title: { fontSize: 28, lineHeight: 36 },
} as const;
export const shadows = { card: { shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 } } as const;
export const iconSizes = { sm: 16, md: 24, lg: 32 } as const;
export const motion = { fast: 150, normal: 250, slow: 400 } as const;
export const touchTargets = { minimum: 44, comfortable: 48 } as const;
export const touchTarget = touchTargets.minimum;
