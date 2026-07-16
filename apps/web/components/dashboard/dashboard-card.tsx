import type { ReactNode } from "react";

type DashboardCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function DashboardCard({ title, description, children, className = "" }: DashboardCardProps) {
  return (
    <section className={`rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6 ${className}`}>
      <div>
        <h2 className="text-lg font-bold text-[#111827] sm:text-xl">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-[#6B7280]">{description}</p> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
