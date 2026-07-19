"use client";

import type {
  AssessmentType,
  GradebookResult,
  TeachingAssignmentResult,
} from "@classroom-os/types";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import { requestApi, thaiApiError } from "@/lib/client-api";

type Props = {
  assignments: TeachingAssignmentResult[];
  gradebook: GradebookResult | null;
};

const inputStyles = "min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600";

function gradeFor(percentage: number | null): string {
  if (percentage === null) return "—";
  if (percentage >= 80) return "4";
  if (percentage >= 75) return "3.5";
  if (percentage >= 70) return "3";
  if (percentage >= 65) return "2.5";
  if (percentage >= 60) return "2";
  if (percentage >= 55) return "1.5";
  if (percentage >= 50) return "1";
  return "0";
}

export function GradebookWorkspace({ assignments, gradebook }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialScores = useMemo(() => Object.fromEntries(
    (gradebook?.students ?? []).flatMap((student) => student.scores.map((score) => [
      `${score.assessmentId}:${student.studentId}`,
      score.value === null ? "" : String(score.value),
    ])),
  ), [gradebook]);
  const [scores, setScores] = useState<Record<string, string>>(initialScores);

  async function createAssessment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!gradebook) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setError(null);
    try {
      await requestApi("/api/assessments", { body: {
        teachingAssignmentId: gradebook.teachingContext.teachingAssignmentId,
        title: data.get("title"),
        type: data.get("type") as AssessmentType,
        maxScore: Number(data.get("maxScore")),
        dueAt: null,
      } });
      form.reset();
      router.refresh();
    } catch (submitError) {
      setError(thaiApiError(submitError));
    } finally {
      setPending(false);
    }
  }

  async function saveScores() {
    if (!gradebook) return;
    setPending(true);
    setError(null);
    try {
      for (const assessment of gradebook.assessments) {
        const records = gradebook.students.flatMap((student) => {
          const raw = scores[`${assessment.id}:${student.studentId}`]?.trim() ?? "";
          if (!raw) return [];
          const value = Number(raw);
          if (!Number.isFinite(value) || value < 0 || value > assessment.maxScore) {
            throw new Error(`คะแนนของ ${student.firstName} ต้องอยู่ระหว่าง 0 ถึง ${assessment.maxScore}`);
          }
          return [{ studentId: student.studentId, value }];
        });
        if (records.length > 0) {
          await requestApi(`/api/assessments/${assessment.id}/scores`, { method: "PUT", body: {
            classroomId: gradebook.teachingContext.classroomId,
            scores: records,
          } });
        }
      }
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error && !("code" in submitError)
        ? submitError.message
        : thaiApiError(submitError));
    } finally {
      setPending(false);
    }
  }

  if (!gradebook) {
    return <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">ต้องสร้างงานสอนก่อนใช้งานสมุดคะแนน</div>;
  }

  return <div className="mt-8 space-y-6">
    <form method="get" className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-end">
      <label className="flex flex-1 flex-col gap-2 text-sm font-semibold text-slate-700">
        ห้องเรียนและรายวิชา
        <select name="assignment" defaultValue={gradebook.teachingContext.teachingAssignmentId} className={inputStyles}>
          {assignments.map((item) => <option key={item.id} value={item.id}>{item.classroomName} · {item.subjectName} · {item.teacherName}</option>)}
        </select>
      </label>
      <button type="submit" className="min-h-11 rounded-xl border border-blue-600 px-5 font-semibold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">เปิดสมุดคะแนน</button>
    </form>

    <form onSubmit={createAssessment} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[1fr_180px_140px_auto] md:items-end">
      <label className="flex flex-col gap-2 text-sm font-semibold">ชื่องาน<input name="title" required className={inputStyles} placeholder="เช่น แบบทดสอบท้ายคาบ" /></label>
      <label className="flex flex-col gap-2 text-sm font-semibold">ประเภท<select name="type" className={inputStyles} defaultValue="quiz"><option value="quiz">แบบทดสอบ</option><option value="homework">การบ้าน</option><option value="exam">สอบ</option><option value="project">โครงงาน</option><option value="participation">การมีส่วนร่วม</option><option value="other">อื่น ๆ</option></select></label>
      <label className="flex flex-col gap-2 text-sm font-semibold">คะแนนเต็ม<input name="maxScore" type="number" min="0.01" step="0.01" required className={inputStyles} defaultValue="10" /></label>
      <button type="submit" disabled={pending} className="min-h-11 rounded-xl bg-blue-600 px-5 font-semibold text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">เพิ่มงาน</button>
    </form>

    {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</p> : null}

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-labelledby="gradebook-table-heading">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 id="gradebook-table-heading" className="font-bold">คะแนนนักเรียน</h2><p className="text-sm text-slate-500">{gradebook.students.length} คน · {gradebook.assessments.length} งาน</p></div><button type="button" onClick={() => void saveScores()} disabled={pending || gradebook.assessments.length === 0} className="min-h-11 rounded-xl bg-blue-600 px-5 font-semibold text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">บันทึกคะแนน</button></div>
      <div className="overflow-x-auto"><table className="min-w-[960px] w-full text-left text-sm"><caption className="sr-only">สมุดคะแนน {gradebook.teachingContext.classroomName} วิชา {gradebook.teachingContext.subjectName}</caption><thead className="bg-slate-50 text-slate-600"><tr><th scope="col" className="sticky left-0 bg-slate-50 px-5 py-3">นักเรียน</th>{gradebook.assessments.map((assessment) => <th scope="col" key={assessment.id} className="px-3 py-3 text-center"><span className="block text-slate-900">{assessment.title}</span><span className="text-xs font-normal">เต็ม {assessment.maxScore}</span></th>)}<th scope="col" className="px-3 py-3 text-right">คิดจากงานที่กรอก</th><th scope="col" className="px-3 py-3 text-center">เกรด</th></tr></thead><tbody className="divide-y divide-slate-100">{gradebook.students.map((student) => <tr key={student.studentId}><th scope="row" className="sticky left-0 bg-white px-5 py-4"><span className="block whitespace-nowrap">{student.firstName} {student.lastName}</span><span className="font-mono text-xs font-normal text-slate-500">{student.studentNumber}</span></th>{gradebook.assessments.map((assessment) => <td key={assessment.id} className="px-3 py-3"><input aria-label={`${assessment.title} ของ ${student.firstName} ${student.lastName}`} type="number" min="0" max={assessment.maxScore} step="0.01" value={scores[`${assessment.id}:${student.studentId}`] ?? ""} onChange={(event) => setScores((current) => ({ ...current, [`${assessment.id}:${student.studentId}`]: event.target.value }))} className="min-h-11 w-24 rounded-lg border border-slate-300 px-2 text-right tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" placeholder="—" /></td>)}<td className="px-3 py-4 text-right tabular-nums">{student.percentage === null ? "—" : `${student.percentage.toFixed(2)}%`}</td><td className="px-3 py-4 text-center"><StatusBadge variant="grade">{gradeFor(student.percentage)}</StatusBadge></td></tr>)}</tbody></table></div>
      {gradebook.assessments.length === 0 ? <p className="p-8 text-center text-slate-500">เพิ่มงานชิ้นแรกเพื่อเริ่มบันทึกคะแนน</p> : null}
    </section>
  </div>;
}
