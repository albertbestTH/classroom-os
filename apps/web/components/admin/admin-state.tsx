import type { ReactNode } from "react";

export function EmptyCollectionState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-5 py-14 text-center" role="status">
      <p className="font-semibold text-[#111827]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#6B7280]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
