import { DashboardLoadingState } from "@/components/dashboard/dashboard-loading-state";

export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-[#F7F8FA] px-4 py-8 text-[#111827] lg:ml-64 lg:px-10">
      <div className="mx-auto w-full max-w-[1440px]">
      <DashboardLoadingState />
      </div>
    </main>
  );
}
