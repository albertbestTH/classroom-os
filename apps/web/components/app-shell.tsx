import type { ReactNode } from "react";

import { Sidebar } from "@/components/sidebar";
import { requireWebSession } from "@/lib/auth";

type AppShellProps = {
  children: ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const { user } = await requireWebSession();

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#111827]">
      <Sidebar currentUser={user} />
      <main className="min-w-0 pb-10 pt-6 lg:ml-64 lg:py-10">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-10">
          {children}
        </div>
      </main>
    </div>
  );
}
