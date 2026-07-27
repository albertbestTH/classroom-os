import type { ReactNode } from "react";

import { Sidebar } from "@/components/sidebar";
import { requireWebSession } from "@/lib/auth";

type AppShellProps = {
  children: ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const { user } = await requireWebSession();

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#0F172A]">
      <Sidebar currentUser={user} />
      <main className="min-w-0 pb-12 pt-5 lg:ml-[216px] lg:py-8">
        <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
