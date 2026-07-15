import type { ReactNode } from "react";

type StatusBadgeVariant = "success" | "warning" | "info" | "neutral" | "grade";

type StatusBadgeProps = {
  children: ReactNode;
  variant?: StatusBadgeVariant;
};

const variantStyles: Record<StatusBadgeVariant, string> = {
  success: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  warning: "bg-amber-50 text-amber-800 ring-amber-600/20",
  info: "bg-blue-50 text-blue-800 ring-blue-600/20",
  neutral: "bg-slate-100 text-slate-700 ring-slate-500/20",
  grade: "bg-blue-600 text-white ring-blue-700/20",
};

export function StatusBadge({ children, variant = "neutral" }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${variantStyles[variant]}`}>
      {children}
    </span>
  );
}
