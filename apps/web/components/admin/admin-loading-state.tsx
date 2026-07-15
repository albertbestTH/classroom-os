export function AdminLoadingState({ label = "กำลังโหลดข้อมูล…" }: { label?: string }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white px-5 py-14 text-center text-sm text-[#6B7280] shadow-sm" role="status">
      {label}
    </div>
  );
}
