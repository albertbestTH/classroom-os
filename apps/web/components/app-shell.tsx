import type { ReactNode } from "react";

import { Sidebar } from "@/components/sidebar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#111827]">
      <Sidebar />
      <main className="min-w-0 pb-10 pt-6 lg:ml-64 lg:py-10">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-10">
          {children}
        </div>
      </main>
    </div>
  );
}
