"use client";

import { AdminErrorState } from "@/components/admin/admin-error-state";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="p-4 lg:ml-64 lg:p-10"><AdminErrorState reset={reset} /></div>;
}
