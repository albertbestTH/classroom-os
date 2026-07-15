export default function StudentsLoading() {
  return (
    <main className="min-h-screen bg-[#F7F8FA] px-4 py-10" aria-busy="true">
      <div className="mx-auto max-w-5xl animate-pulse space-y-5">
        <div className="h-10 w-64 rounded-lg bg-slate-200" />
        <div className="h-28 rounded-2xl bg-white" />
        <div className="h-80 rounded-2xl bg-white" />
      </div>
      <span className="sr-only">กำลังโหลดหน้ารายชื่อนักเรียน</span>
    </main>
  );
}
