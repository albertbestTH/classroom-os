import type { ReactNode } from "react";

type DashboardCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
};

export function DashboardCard({ title, description, children, className = "", headerAction }: DashboardCardProps) {
  return (
    <section className={`rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.5)] sm:p-6 ${className}`}>
      <div className={headerAction ? "flex items-start justify-between gap-3" : undefined}>
        <div>
        <h2 className="text-lg font-bold tracking-tight text-[#0F172A] sm:text-xl">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
        </div>
        {headerAction}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
