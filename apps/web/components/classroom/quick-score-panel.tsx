"use client";

import type { AssessmentResult, ClassSessionResult, GradebookResult } from "@classroom-os/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { InlineScrollToTopButton } from "@/components/inline-scroll-to-top-button";
import { requestApi, thaiApiError } from "@/lib/client-api";
import { parseScoreInput } from "@/lib/score-input";

type QuickScorePanelProps = {
  session: ClassSessionResult;
  gradebook: GradebookResult;
  assessment: AssessmentResult | null;
};

export function QuickScorePanel({ session, gradebook, assessment }: QuickScorePanelProps) {
  const router = useRouter();
  const submitting = useRef(false);
  const initial = Object.fromEntries(
    gradebook.students.map((student) => [
      student.studentId,
      assessment ? String(student.scores.find((score) => score.assessmentId === assessment.id)?.value ?? "") : "",
    ]),
  );
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const readOnly = session.status === "completed" || session.status === "cancelled";
  const validations = assessment
    ? Object.fromEntries(
        gradebook.students.map((student) => [
          student.studentId,
          parseScoreInput(values[student.studentId] ?? "", assessment.maxScore),
        ]),
      )
    : {};
  const invalid = Object.values(validations).some((result) => result.kind === "invalid");

  async function createQuickAssessment() {
    if (assessment || creating || readOnly) return;
    setCreating(true);
    setError(null);
    try {
      await requestApi("/api/assessments", {
        method: "POST",
        body: {
          teachingAssignmentId: session.teachingAssignmentId,
          classSessionId: session.id,
          title: `คะแนนด่วน · ${session.subjectName}`,
          type: "participation",
          maxScore: 10,
        },
      });
      router.refresh();
    } catch (createError) {
      setError(thaiApiError(createError));
    } finally {
      setCreating(false);
    }
  }

  async function save() {
    if (!assessment || submitting.current || pending || invalid || changed.size === 0) return;
    submitting.current = true;
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      const scores = [...changed].flatMap((studentId) => {
        const parsed = parseScoreInput(values[studentId] ?? "", assessment.maxScore);
        return parsed.kind === "valid" ? [{ studentId, value: parsed.value }] : [];
      });
      if (scores.length) {
        await requestApi(`/api/assessments/${assessment.id}/scores`, {
          method: "PUT",
          body: { classroomId: session.classroomId, scores },
        });
      }
      setChanged(new Set());
      setSaved(true);
      router.replace(`/sessions/${session.id}?scoreSaved=1`);
    } catch (saveError) {
      setError(thaiApiError(saveError));
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">คะแนนด่วน</h1>
          <p className="mt-1 text-sm text-slate-600">{session.classroomName} · {session.subjectName}</p>
        </div>
        <Link
          href={`/sessions/${session.id}`}
          aria-label="กลับไป Live Class"
          className="inline-flex min-h-11 items-center rounded-xl px-4 font-semibold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          ← กลับไป Live Class
        </Link>
      </div>

      {!assessment ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <span>รายชื่อนักเรียนของคาบนี้พร้อมแล้ว สร้างช่องคะแนนเพื่อเริ่มกรอกคะแนน</span>
          {!readOnly ? (
            <button
              type="button"
              onClick={createQuickAssessment}
              disabled={creating}
              className="min-h-11 rounded-xl bg-blue-600 px-4 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {creating ? "กำลังเตรียม…" : "เตรียมช่องคะแนน"}
            </button>
          ) : null}
        </div>
      ) : null}

      {gradebook.students.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">ไม่พบนักเรียนในห้องเรียนนี้</p>
      ) : (
        <div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">นักเรียน</th>
                <th className="px-4 py-3 text-left">เลขประจำตัว</th>
                <th className="px-4 py-3 text-left">คะแนน{assessment ? `เต็ม ${assessment.maxScore}` : ""}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gradebook.students.map((student) => {
                const validation = validations[student.studentId];
                return (
                    <tr key={student.studentId}>
                      <td className="px-4 py-3 font-semibold">{student.firstName} {student.lastName}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{student.studentNumber}</td>
                      <td className="px-4 py-3">
                        {assessment ? (
                          <>
                            <input
                              aria-label={`คะแนนของ ${student.firstName} ${student.lastName}`}
                              inputMode="decimal"
                              type="number"
                              min={0}
                              max={assessment.maxScore}
                              step="0.01"
                              disabled={readOnly || pending}
                              value={values[student.studentId] ?? ""}
                              onChange={(event) => {
                                setValues((current) => ({ ...current, [student.studentId]: event.target.value }));
                                setChanged((current) => new Set(current).add(student.studentId));
                                setSaved(false);
                              }}
                              className="min-h-11 w-24 rounded-xl border border-slate-300 px-3 text-right text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:bg-slate-100"
                            />
                            <span className="ml-2 text-sm text-slate-500">/ {assessment.maxScore}</span>
                            {validation?.kind === "invalid" ? <p className="mt-1 text-sm text-red-700" role="alert">{validation.message}</p> : null}
                          </>
                        ) : (
                          <span className="text-slate-500">ยังไม่บันทึก</span>
                        )}
                      </td>
                    </tr>
                );
              })}
            </tbody>
            </table>
          </div>
          <InlineScrollToTopButton />
        </div>
      )}

      {assessment && !readOnly ? (
        <button
          type="button"
          onClick={save}
          disabled={pending || invalid || changed.size === 0}
          className="min-h-12 rounded-xl bg-blue-600 px-6 font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {pending ? "กำลังบันทึก…" : "บันทึกคะแนนที่เปลี่ยน"}
        </button>
      ) : null}
      {saved ? <p className="rounded-xl bg-emerald-50 px-4 py-3 font-semibold text-emerald-800" role="status">บันทึกคะแนนเรียบร้อยแล้ว</p> : null}
      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-red-800" role="alert">{error}</p> : null}
    </div>
  );
}
