import type { ReactNode } from "react";

import { requireTeacherWebSession } from "@/lib/auth";

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  await requireTeacherWebSession();
  return children;
}
