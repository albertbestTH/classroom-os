export declare const semanticTokens: {
    readonly light: {
        readonly brand: {
            readonly primary: "#2563EB";
            readonly primaryHover: "#1D4ED8";
            readonly primaryPressed: "#123D9A";
            readonly primarySoft: "#E8F1FF";
            readonly accent: "#14B8A6";
        };
        readonly background: {
            readonly canvas: "#F7F9FC";
            readonly subtle: "#F1F5F9";
        };
        readonly surface: {
            readonly default: "#FFFFFF";
            readonly elevated: "#FFFFFF";
            readonly highlight: "#EFF6FF";
        };
        readonly text: {
            readonly primary: "#0F172A";
            readonly secondary: "#334155";
            readonly muted: "#64748B";
            readonly inverse: "#FFFFFF";
        };
        readonly border: {
            readonly default: "#E7ECF3";
            readonly strong: "#CBD5E1";
        };
        readonly focus: {
            readonly ring: "#2563EB";
        };
        readonly feedback: {
            readonly success: "#16B67A";
            readonly warning: "#F59E0B";
            readonly danger: "#F04D45";
            readonly info: "#2563EB";
        };
        readonly attendance: {
            readonly present: "#16B67A";
            readonly late: "#F59E0B";
            readonly leave: "#64748B";
            readonly absent: "#F04D45";
            readonly unrecorded: "#94A3B8";
        };
        readonly session: {
            readonly scheduled: "#64748B";
            readonly live: "#2563EB";
            readonly completed: "#16B67A";
            readonly cancelled: "#F04D45";
        };
    };
    readonly dark: {
        readonly brand: {
            readonly primary: "#60A5FA";
            readonly primaryHover: "#93C5FD";
            readonly primaryPressed: "#BFDBFE";
            readonly primarySoft: "#172554";
            readonly accent: "#2DD4BF";
        };
        readonly background: {
            readonly canvas: "#030712";
            readonly subtle: "#111827";
        };
        readonly surface: {
            readonly default: "#111827";
            readonly elevated: "#1F2937";
            readonly highlight: "#172554";
        };
        readonly text: {
            readonly primary: "#F9FAFB";
            readonly secondary: "#E5E7EB";
            readonly muted: "#CBD5E1";
            readonly inverse: "#08101F";
        };
        readonly border: {
            readonly default: "#374151";
            readonly strong: "#4B5563";
        };
        readonly focus: {
            readonly ring: "#93C5FD";
        };
        readonly feedback: {
            readonly success: "#4ADE80";
            readonly warning: "#FBBF24";
            readonly danger: "#F87171";
            readonly info: "#60A5FA";
        };
        readonly attendance: {
            readonly present: "#4ADE80";
            readonly late: "#FBBF24";
            readonly leave: "#CBD5E1";
            readonly absent: "#F87171";
            readonly unrecorded: "#94A3B8";
        };
        readonly session: {
            readonly scheduled: "#CBD5E1";
            readonly live: "#60A5FA";
            readonly completed: "#4ADE80";
            readonly cancelled: "#F87171";
        };
    };
};
export declare const spacing: {
    readonly xs: 4;
    readonly sm: 8;
    readonly md: 12;
    readonly lg: 16;
    readonly xl: 24;
    readonly xxl: 32;
    readonly xxxl: 40;
};
export declare const radii: {
    readonly control: 12;
    readonly card: 18;
    readonly panel: 24;
    readonly pill: 999;
};
export declare const motion: {
    readonly fast: 150;
    readonly normal: 250;
    readonly slow: 400;
};
export declare const touchTargets: {
    readonly minimum: 44;
    readonly preferred: 48;
};
export declare const typography: {
    readonly display: {
        readonly family: "LINESeedSansTHBold";
        readonly size: 32;
        readonly weight: 700;
        readonly lineHeight: 40;
    };
    readonly headingLarge: {
        readonly family: "LINESeedSansTHBold";
        readonly size: 28;
        readonly weight: 700;
        readonly lineHeight: 36;
    };
    readonly headingMedium: {
        readonly family: "LINESeedSansTHBold";
        readonly size: 20;
        readonly weight: 700;
        readonly lineHeight: 28;
    };
    readonly headingSmall: {
        readonly family: "LINESeedSansTHBold";
        readonly size: 18;
        readonly weight: 700;
        readonly lineHeight: 26;
    };
    readonly bodyLarge: {
        readonly family: "LINESeedSansTH";
        readonly size: 17;
        readonly weight: 400;
        readonly lineHeight: 26;
    };
    readonly body: {
        readonly family: "LINESeedSansTH";
        readonly size: 16;
        readonly weight: 400;
        readonly lineHeight: 24;
    };
    readonly bodySmall: {
        readonly family: "LINESeedSansTH";
        readonly size: 14;
        readonly weight: 400;
        readonly lineHeight: 21;
    };
    readonly label: {
        readonly family: "LINESeedSansTHBold";
        readonly size: 14;
        readonly weight: 700;
        readonly lineHeight: 20;
    };
    readonly caption: {
        readonly family: "LINESeedSansTH";
        readonly size: 13;
        readonly weight: 400;
        readonly lineHeight: 18;
    };
    readonly metricLarge: {
        readonly family: "LINESeedSansTHBold";
        readonly size: 32;
        readonly weight: 700;
        readonly lineHeight: 40;
    };
    readonly metricMedium: {
        readonly family: "LINESeedSansTHBold";
        readonly size: 24;
        readonly weight: 700;
        readonly lineHeight: 32;
    };
};
export type ThemeName = keyof typeof semanticTokens;
export type SemanticTokens = (typeof semanticTokens)[ThemeName];
