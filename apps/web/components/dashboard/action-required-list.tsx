import type { DashboardActionItem } from "@classroom-os/types";
import Link from "next/link";

const priorityStyles = {
  high: "border-red-200 bg-red-50 text-red-800",
  medium: "border-amber-200 bg-amber-50 text-amber-900",
  low: "border-slate-200 bg-slate-50 text-slate-700",
} as const;

export function ActionRequiredList({ actions }: { actions: DashboardActionItem[] }) {
  if (actions.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-8 text-center" role="status">
        <p className="font-semibold text-emerald-900">ไม่มีรายการเร่งด่วน</p>
        <p className="mt-1 text-sm text-emerald-800">คาบเรียนและการเช็กชื่อในขอบเขตนี้เรียบร้อยดี</p>
      </div>
    );
  }
  return (
    <ol className="space-y-3">
      {actions.map((action) => (
        <li key={action.id}>
          <Link href={action.href} className={`block rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${priorityStyles[action.priority]}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{action.title}</p>
                <p className="mt-1 text-sm leading-5 opacity-90">{action.description}</p>
              </div>
              <span aria-hidden="true">→</span>
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );
}
