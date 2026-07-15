import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar />
        <section className="min-w-0 flex-1 px-6 py-8 lg:px-10">{children}</section>
      </div>
    </main>
  );
}
