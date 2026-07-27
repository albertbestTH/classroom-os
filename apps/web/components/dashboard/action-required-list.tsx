import type { DashboardActionItem } from "@classroom-os/types";
import Link from "next/link";
import { ClipboardList, FileText, MessageCircle, ChevronRight } from "lucide-react";

function ActionIcon({ type }: { type: DashboardActionItem["type"] }) {
  const Icon = type === "MISSED_CLASS" || type === "INCOMPLETE_ATTENDANCE" ? ClipboardList : type === "REPEATED_ABSENCE" ? FileText : MessageCircle;
  return <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Icon size={18} strokeWidth={1.9} aria-hidden="true" /></span>;
}

export function ActionRequiredList({ actions }: { actions: DashboardActionItem[] }) {
  if (actions.length === 0) return <div className="rounded-xl border border-dashed border-slate-300 px-5 py-8 text-center" role="status"><p className="font-semibold">ไม่มีรายการที่ต้องติดตาม</p><p className="mt-1 text-sm text-slate-500">งานของวันนี้เรียบร้อยดี</p></div>;
  return <ol className="space-y-2">{actions.slice(0, 3).map((action) => <li key={action.id}><Link href={action.href} className="flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"><ActionIcon type={action.type} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900">{action.title}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{action.description}</span></span><span className={`text-xs font-semibold ${action.priority === "high" ? "text-red-500" : "text-slate-500"}`}>{action.priority === "high" ? "เร่งด่วน" : "ติดตาม"}</span><ChevronRight size={16} className="text-slate-400" aria-hidden="true" /></Link></li>)}</ol>;
}
