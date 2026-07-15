import { AdminLoadingState } from "@/components/admin/admin-loading-state";

export default function AdminLoading() {
  return <div className="p-4 lg:ml-64 lg:p-10"><AdminLoadingState label="กำลังโหลดหน้าจัดการ…" /></div>;
}
