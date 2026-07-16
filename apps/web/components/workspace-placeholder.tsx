type WorkspacePlaceholderProps = {
  title: string;
  description: string;
};

export function WorkspacePlaceholder({ title, description }: WorkspacePlaceholderProps) {
  return (
    <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm" aria-labelledby="workspace-placeholder-heading">
      <h2 id="workspace-placeholder-heading" className="text-lg font-bold text-[#111827]">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#6B7280]">{description}</p>
    </section>
  );
}
