import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

export type AppIconName = "today" | "calendar" | "scores" | "profile";

export function AppIcon({ name, color, size = 20 }: { name: AppIconName; color: string; size?: number }) {
  const common = { stroke: color, strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "today") return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Rect x="3" y="4" width="18" height="17" rx="3" {...common} /><Line x1="3" y1="9" x2="21" y2="9" {...common} /><Line x1="8" y1="2.5" x2="8" y2="6" {...common} /><Line x1="16" y1="2.5" x2="16" y2="6" {...common} /><Circle cx="8" cy="14" r="1" fill={color} /><Circle cx="12" cy="14" r="1" fill={color} /></Svg>;
  if (name === "calendar") return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Rect x="3" y="4" width="18" height="17" rx="3" {...common} /><Line x1="3" y1="9" x2="21" y2="9" {...common} /><Line x1="8" y1="2.5" x2="8" y2="6" {...common} /><Line x1="16" y1="2.5" x2="16" y2="6" {...common} /><Line x1="8" y1="13" x2="16" y2="13" {...common} /><Line x1="8" y1="17" x2="13" y2="17" {...common} /></Svg>;
  if (name === "scores") return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Line x1="5" y1="20" x2="5" y2="11" {...common} /><Line x1="12" y1="20" x2="12" y2="5" {...common} /><Line x1="19" y1="20" x2="19" y2="8" {...common} /><Line x1="3" y1="20" x2="21" y2="20" {...common} /></Svg>;
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="8" r="3.5" {...common} /><Path d="M4.5 20c.8-3.5 3.2-5.5 7.5-5.5s6.7 2 7.5 5.5" {...common} /></Svg>;
}
