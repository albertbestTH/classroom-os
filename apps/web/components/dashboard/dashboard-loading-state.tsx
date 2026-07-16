export function DashboardLoadingState() {
  return (
    <div className="animate-pulse" aria-label="กำลังโหลดภาพรวม" role="status">
      <div className="h-4 w-48 rounded bg-slate-200" />
      <div className="mt-3 h-9 w-72 rounded bg-slate-200" />
      <div className="mt-3 h-5 max-w-xl rounded bg-slate-200" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-32 rounded-2xl border border-slate-200 bg-white" />)}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="h-96 rounded-2xl border border-slate-200 bg-white" />
        <div className="h-96 rounded-2xl border border-slate-200 bg-white" />
      </div>
      <span className="sr-only">กำลังโหลดข้อมูลและกราฟ</span>
    </div>
  );
}
