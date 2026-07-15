import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { assessments, getLetterGrade, getTotalScore, gradebookRecords } from "@/data/mock-data";

export default function GradebookPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="ป.5/1 · คณิตศาสตร์"
        title="สมุดคะแนน"
        description="ภาคเรียนที่ 1/2569 · คะแนนเต็มรวม 100 คะแนน"
        action={
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            + เพิ่มงาน
          </button>
        }
      />

      <section className="mt-8 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm" aria-labelledby="gradebook-table-heading">
        <div className="flex flex-col gap-1 border-b border-[#E5E7EB] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="gradebook-table-heading" className="font-bold text-[#111827]">คะแนนนักเรียน</h2>
          <p className="text-sm text-[#6B7280]">นักเรียน {gradebookRecords.length} คน</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <caption className="sr-only">คะแนนรายวิชาคณิตศาสตร์ ห้อง ป.5/1 ภาคเรียนที่ 1 ปีการศึกษา 2569</caption>
            <thead className="bg-slate-50 text-[#6B7280]">
              <tr>
                <th scope="col" className="sticky left-0 z-10 min-w-56 bg-slate-50 px-5 py-3.5 font-semibold">นักเรียน</th>
                {assessments.map((assessment) => (
                  <th key={assessment.key} scope="col" title={assessment.label} className="px-5 py-3.5 text-right font-semibold">
                    <span className="block text-[#111827]">{assessment.shortLabel}</span>
                    <span className="mt-0.5 block text-xs font-normal">เต็ม {assessment.maxScore}</span>
                  </th>
                ))}
                <th scope="col" className="px-5 py-3.5 text-right font-semibold">
                  <span className="block text-[#111827]">รวม</span>
                  <span className="mt-0.5 block text-xs font-normal">เต็ม 100</span>
                </th>
                <th scope="col" className="px-5 py-3.5 text-center font-semibold">เกรด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gradebookRecords.map((record) => {
                const total = getTotalScore(record.scores);

                return (
                  <tr key={record.studentId} className="transition-colors hover:bg-slate-50">
                    <th scope="row" className="sticky left-0 z-10 bg-white px-5 py-4 font-semibold text-[#111827]">
                      <span className="block whitespace-nowrap">{record.studentName}</span>
                      <span className="mt-1 block font-mono text-xs font-normal text-[#6B7280]">{record.studentId}</span>
                    </th>
                    {assessments.map((assessment) => (
                      <td key={assessment.key} className="px-5 py-4 text-right tabular-nums">{record.scores[assessment.key]}</td>
                    ))}
                    <td className="px-5 py-4 text-right font-bold tabular-nums text-[#111827]">{total}</td>
                    <td className="px-5 py-4 text-center">
                      <StatusBadge variant="grade">{getLetterGrade(total)}</StatusBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
