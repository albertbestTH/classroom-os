import type { DashboardOverviewResult } from "@classroom-os/types";

export function DashboardFilters({ overview }: { overview: DashboardOverviewResult }) {
  return (
    <form method="get" className="flex flex-col gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:flex-row sm:items-end" aria-label="ตัวกรองภาพรวมโรงเรียน">
      <label className="flex-1 text-sm font-medium text-[#374151]">
        ช่วงเวลา
        <select name="days" defaultValue={String(overview.days)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D1D5DB] bg-white px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
          <option value="7">7 วันล่าสุด</option>
          <option value="30">30 วันล่าสุด</option>
        </select>
      </label>
      <label className="flex-1 text-sm font-medium text-[#374151]">
        ชั้นเรียน
        <select name="classroomId" defaultValue={overview.filters.classroomId ?? ""} className="mt-1 min-h-11 w-full rounded-lg border border-[#D1D5DB] bg-white px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
          <option value="">ทุกชั้นเรียน</option>
          {overview.filterOptions.classrooms.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </label>
      <label className="flex-1 text-sm font-medium text-[#374151]">
        ครูผู้สอน
        <select name="teacherId" defaultValue={overview.filters.teacherId ?? ""} className="mt-1 min-h-11 w-full rounded-lg border border-[#D1D5DB] bg-white px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
          <option value="">ครูทุกคน</option>
          {overview.filterOptions.teachers.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </label>
      <button type="submit" className="min-h-11 rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">แสดงผล</button>
    </form>
  );
}
