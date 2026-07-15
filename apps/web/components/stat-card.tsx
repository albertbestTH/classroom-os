type StatCardProps = {
  label: string;
  value: string;
  detail?: string;
};

export function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <article className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-[#6B7280]">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-[#111827]">{value}</p>
      {detail ? <p className="mt-2 text-xs text-[#6B7280]">{detail}</p> : null}
    </article>
  );
}
