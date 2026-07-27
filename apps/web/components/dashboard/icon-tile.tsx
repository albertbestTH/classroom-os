import type { ReactNode } from "react";

export function IconTile({ children }: { children: ReactNode }) {
  return <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-[#E8F1FF] text-[#2563EB]">{children}</span>;
}
