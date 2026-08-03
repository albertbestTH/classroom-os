export const semanticTokens = {
    light: {
        brand: { primary: "#2563EB", primaryHover: "#1D4ED8", primaryPressed: "#123D9A", primarySoft: "#E8F1FF", accent: "#14B8A6" },
        background: { canvas: "#F7F9FC", subtle: "#F1F5F9" },
        surface: { default: "#FFFFFF", elevated: "#FFFFFF", highlight: "#EFF6FF" },
        text: { primary: "#0F172A", secondary: "#334155", muted: "#64748B", inverse: "#FFFFFF" },
        border: { default: "#E7ECF3", strong: "#CBD5E1" },
        focus: { ring: "#2563EB" },
        feedback: { success: "#16B67A", warning: "#F59E0B", danger: "#F04D45", info: "#2563EB" },
        attendance: { present: "#16B67A", late: "#F59E0B", leave: "#64748B", absent: "#F04D45", unrecorded: "#94A3B8" },
        session: { scheduled: "#64748B", live: "#2563EB", completed: "#16B67A", cancelled: "#F04D45" },
    },
    dark: {
        brand: { primary: "#60A5FA", primaryHover: "#93C5FD", primaryPressed: "#BFDBFE", primarySoft: "#172554", accent: "#2DD4BF" },
        background: { canvas: "#030712", subtle: "#111827" },
        surface: { default: "#111827", elevated: "#1F2937", highlight: "#172554" },
        text: { primary: "#F9FAFB", secondary: "#E5E7EB", muted: "#CBD5E1", inverse: "#08101F" },
        border: { default: "#374151", strong: "#4B5563" },
        focus: { ring: "#93C5FD" },
        feedback: { success: "#4ADE80", warning: "#FBBF24", danger: "#F87171", info: "#60A5FA" },
        attendance: { present: "#4ADE80", late: "#FBBF24", leave: "#CBD5E1", absent: "#F87171", unrecorded: "#94A3B8" },
        session: { scheduled: "#CBD5E1", live: "#60A5FA", completed: "#4ADE80", cancelled: "#F87171" },
    },
};
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 40 };
export const radii = { control: 12, card: 18, panel: 24, pill: 999 };
export const motion = { fast: 150, normal: 250, slow: 400 };
export const touchTargets = { minimum: 44, preferred: 48 };
export const typography = {
    display: { family: "LINESeedSansTHBold", size: 32, weight: 700, lineHeight: 40 },
    headingLarge: { family: "LINESeedSansTHBold", size: 28, weight: 700, lineHeight: 36 },
    headingMedium: { family: "LINESeedSansTHBold", size: 20, weight: 700, lineHeight: 28 },
    headingSmall: { family: "LINESeedSansTHBold", size: 18, weight: 700, lineHeight: 26 },
    bodyLarge: { family: "LINESeedSansTH", size: 17, weight: 400, lineHeight: 26 },
    body: { family: "LINESeedSansTH", size: 16, weight: 400, lineHeight: 24 },
    bodySmall: { family: "LINESeedSansTH", size: 14, weight: 400, lineHeight: 21 },
    label: { family: "LINESeedSansTHBold", size: 14, weight: 700, lineHeight: 20 },
    caption: { family: "LINESeedSansTH", size: 13, weight: 400, lineHeight: 18 },
    metricLarge: { family: "LINESeedSansTHBold", size: 32, weight: 700, lineHeight: 40 },
    metricMedium: { family: "LINESeedSansTHBold", size: 24, weight: 700, lineHeight: 32 },
};
