"use client";

import { CheckCircle2, CircleAlert, Info, TriangleAlert, X } from "lucide-react";

export type ToastKind = "success" | "error" | "warning" | "info";

export function Toast({ kind, message, onClose }: { kind: ToastKind; message: string; onClose?: () => void }) {
  const Icon = kind === "success" ? CheckCircle2 : kind === "error" ? CircleAlert : kind === "warning" ? TriangleAlert : Info;
  return <div role={kind === "error" ? "alert" : "status"} aria-live="polite" className={`fixed right-4 top-4 z-[70] flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg ${kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : kind === "error" ? "border-red-200 bg-red-50 text-red-900" : kind === "warning" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-blue-200 bg-blue-50 text-blue-900"}`}><Icon aria-hidden="true" size={19} /><span className="flex-1">{message}</span>{onClose ? <button type="button" onClick={onClose} aria-label="ปิดการแจ้งเตือน" className="rounded-md p-1 focus-visible:ring-2 focus-visible:ring-blue-600"><X size={16} /></button> : null}</div>;
}
