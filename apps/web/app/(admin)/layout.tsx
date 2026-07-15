import type { ReactNode } from "react";

import { requireAdminWebSession } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminWebSession();
  return children;
}
