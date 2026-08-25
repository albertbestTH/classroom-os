"use client";

import type {
  GradebookAssessmentResult,
  GradebookResult,
  TeachingAssignmentResult,
} from "@classroom-os/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { requestApi, thaiApiError } from "@/lib/client-api";
import { parseGradebookScoreCsv, type GradebookCsvScore } from "@/lib/gradebook-csv";

type Props = {
  assignments: TeachingAssignmentResult[];
  gradebook: GradebookResult | null;
};

type GradebookView = "overview" | "student-scores" | "assessments" | "settings";

type AssessmentGroup = {
  id: string;
  name: string;
  assessments: GradebookAssessmentResult[];
  tone: CategoryTone;
};

type CategoryTone = {
  card: string;
  heading: string;
  header: string;
  accent: string;
};

const gradebookTabs: ReadonlyArray<{ id: GradebookView; label: string }> = [
  { id: "overview", label: "ภาพรวม" },
  { id: "student-scores", label: "คะแนนนักเรียน" },
  { id: "assessments", label: "รายการคะแนน" },
  { id: "settings", label: "ตั้งค่าคะแนน" },
];

const categoryTones: CategoryTone[] = [
  {
    card: "border-blue-200 bg-blue-50/80",
    heading: "text-blue-700",
    header: "border-blue-200 bg-blue-50 text-blue-800",
    accent: "bg-blue-500",
  },
  {
    card: "border-violet-200 bg-violet-50/80",
    heading: "text-violet-700",
    header: "border-violet-200 bg-violet-50 text-violet-800",
    accent: "bg-violet-500",
  },
  {
    card: "border-amber-200 bg-amber-50/80",
    heading: "text-amber-700",
    header: "border-amber-200 bg-amber-50 text-amber-800",
    accent: "bg-amber-500",
  },
  {
    card: "border-emerald-200 bg-emerald-50/80",
    heading: "text-emerald-700",
    header: "border-emerald-200 bg-emerald-50 text-emerald-800",
    accent: "bg-emerald-500",
  },
];

const inputStyles =
  "min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-600/20";
const scoreKey = (assessmentId: string, studentId: string) =>
  `${assessmentId}:${studentId}`;

export function GradebookWorkspace({ assignments, gradebook }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<GradebookView>("student-scores");
  const [editingAssessment, setEditingAssessment] =
    useState<GradebookAssessmentResult | null>(null);
  const [showScoreImport, setShowScoreImport] = useState(false);
  const [importAssessmentId, setImportAssessmentId] = useState(
    gradebook?.assessments[0]?.id ?? "",
  );
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<GradebookCsvScore[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const scoreImportInputRef = useRef<HTMLInputElement>(null);
  const initialScores = useMemo(
    () =>
      Object.fromEntries(
        (gradebook?.students ?? []).flatMap((student) =>
          student.scores.map((score) => [
            scoreKey(score.assessmentId, student.studentId),
            score.value === null ? "" : String(score.value),
          ]),
        ),
      ),
    [gradebook],
  );
  const [scores, setScores] = useState<Record<string, string>>(initialScores);
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  const assessmentGroups = useMemo<AssessmentGroup[]>(() => {
    if (!gradebook) return [];

    const groups = gradebook.categories
      .map((category, index) => ({
        id: category.id,
        name: category.name,
        assessments: gradebook.assessments.filter(
          (assessment) => assessment.categoryId === category.id,
        ),
        tone: categoryTones[index % categoryTones.length],
      }))
      .filter((group) => group.assessments.length > 0);
    const uncategorized = gradebook.assessments.filter(
      (assessment) =>
        !gradebook.categories.some((category) => category.id === assessment.categoryId),
    );

    if (uncategorized.length > 0) {
      groups.push({
        id: "uncategorized",
        name: "ไม่ระบุหมวด",
        assessments: uncategorized,
        tone: {
          card: "border-slate-200 bg-slate-50",
          heading: "text-slate-700",
          header: "border-slate-200 bg-slate-100 text-slate-700",
          accent: "bg-slate-400",
        },
      });
    }

    return groups;
  }, [gradebook]);

  const orderedAssessments = useMemo(
    () => assessmentGroups.flatMap((group) => group.assessments),
    [assessmentGroups],
  );

  useEffect(() => {
    if (!editingAssessment) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setEditingAssessment(null);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [editingAssessment]);

  async function runMutation(action: () => Promise<unknown>, success: string) {
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(success);
      router.refresh();
      return true;
    } catch (submitError) {
      setError(thaiApiError(submitError));
      return false;
    } finally {
      setPending(false);
    }
  }

  async function createCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!gradebook) return;
    const form = event.currentTarget;
    const name = new FormData(form).get("name");
    const saved = await runMutation(
      () =>
        requestApi("/api/score-categories", {
          body: {
            teachingAssignmentId: gradebook.teachingContext.teachingAssignmentId,
            name,
          },
        }),
      "เพิ่มหมวดคะแนนแล้ว",
    );
    if (saved) form.reset();
  }

  async function createAssessment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!gradebook) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const saved = await runMutation(
      () =>
        requestApi("/api/assessments", {
          body: {
            teachingAssignmentId: gradebook.teachingContext.teachingAssignmentId,
            title: data.get("title"),
            type: "other",
            categoryId: data.get("categoryId"),
            maxScore: Number(data.get("maxScore")),
            assessmentDate: data.get("assessmentDate"),
            dueAt: null,
          },
        }),
      "เพิ่มรายการคะแนนแล้ว",
    );
    if (saved) form.reset();
  }

  async function saveAssessment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingAssessment) return;
    const data = new FormData(event.currentTarget);
    const saved = await runMutation(
      () =>
        requestApi(`/api/assessments/${editingAssessment.id}`, {
          method: "PATCH",
          body: {
            title: data.get("title"),
            categoryId: data.get("categoryId"),
            maxScore: Number(data.get("maxScore")),
            assessmentDate: data.get("assessmentDate"),
          },
        }),
      "แก้ไขรายการคะแนนแล้ว",
    );
    if (saved) setEditingAssessment(null);
  }

  async function saveScores() {
    if (!gradebook || dirty.size === 0) return;
    await runMutation(async () => {
      for (const assessment of gradebook.assessments) {
        const records: Array<{ studentId: string; value: number | null }> = [];
        for (const student of gradebook.students) {
          const key = scoreKey(assessment.id, student.studentId);
          if (!dirty.has(key)) continue;
          const raw = scores[key]?.trim() ?? "";
          if (raw === "") {
            records.push({ studentId: student.studentId, value: null });
            continue;
          }
          const value = Number(raw);
          if (!Number.isFinite(value) || value < 0 || value > assessment.maxScore) {
            throw new Error(
              `คะแนนของ ${student.firstName} ต้องอยู่ระหว่าง 0 ถึง ${assessment.maxScore}`,
            );
          }
          records.push({ studentId: student.studentId, value });
        }
        if (records.length) {
          await requestApi(`/api/assessments/${assessment.id}/scores`, {
            method: "PUT",
            body: {
              classroomId: gradebook.teachingContext.classroomId,
              scores: records,
            },
          });
        }
      }
      setDirty(new Set());
    }, "บันทึกคะแนนดิบแล้ว");
  }

  async function selectScoreCsv(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setImportPreview([]);
    setImportError(null);
    setImportFileName(file?.name ?? null);
    if (!file || !gradebook) return;
    if (file.size > 1024 * 1024) {
      setImportError("ไฟล์ CSV ต้องมีขนาดไม่เกิน 1 MB");
      return;
    }

    const assessment = gradebook.assessments.find((item) => item.id === importAssessmentId);
    if (!assessment) {
      setImportError("กรุณาเลือกรายการคะแนนก่อนเลือกไฟล์ CSV");
      return;
    }

    try {
      const records = parseGradebookScoreCsv(
        await file.text(),
        gradebook.students.map((student) => ({
          studentId: student.studentId,
          studentNumber: student.studentNumber,
          displayName: `${student.firstName} ${student.lastName}`,
        })),
        assessment.maxScore,
      );
      setImportPreview(records);
    } catch (csvError) {
      setImportError(csvError instanceof Error ? csvError.message : "ไม่สามารถอ่านไฟล์ CSV ได้");
    }
  }

  async function importScoreCsv() {
    if (!gradebook || !importAssessmentId || importPreview.length === 0) return;
    const assessment = gradebook.assessments.find((item) => item.id === importAssessmentId);
    if (!assessment) return;
    const saved = await runMutation(
      () =>
        requestApi(`/api/assessments/${assessment.id}/scores`, {
          method: "PUT",
          body: {
            classroomId: gradebook.teachingContext.classroomId,
            scores: importPreview.map((record) => ({
              studentId: record.studentId,
              value: record.value,
            })),
          },
        }),
      `นำเข้าคะแนน ${importPreview.length} คนแล้ว`,
    );
    if (!saved) return;

    setScores((current) => {
      const next = { ...current };
      for (const record of importPreview) {
        next[scoreKey(assessment.id, record.studentId)] = String(record.value);
      }
      return next;
    });
    setDirty((current) => {
      const next = new Set(current);
      for (const record of importPreview) {
        next.delete(scoreKey(assessment.id, record.studentId));
      }
      return next;
    });
    setImportPreview([]);
    setImportFileName(null);
    if (scoreImportInputRef.current) scoreImportInputRef.current.value = "";
  }

  if (!gradebook) {
    return (
      <div className="mt-5">
        <CompactHeading />
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          ต้องมีงานสอนก่อนจึงจะใช้สมุดคะแนนได้
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mt-2 space-y-4">
      <section className="overflow-hidden rounded-[18px] border border-[#E8EEF6] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">สมุดคะแนน</h1>
            <p className="mt-1 truncate text-sm text-slate-500">
              {gradebook.teachingContext.subjectName} · {gradebook.teachingContext.classroomName} · {gradebook.teachingContext.termName}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <form method="get" className="flex min-w-0 items-center gap-2">
              <label className="sr-only" htmlFor="gradebook-assignment">เลือกชั้นเรียนและรายวิชา</label>
              <select
                id="gradebook-assignment"
                name="assignment"
                defaultValue={gradebook.teachingContext.teachingAssignmentId}
                className={`${inputStyles} min-w-0 flex-1 sm:w-64`}
              >
                {assignments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.classroomName} · {item.subjectName}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="min-h-10 shrink-0 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                เปิด
              </button>
            </form>
          </div>
        </div>

        <nav aria-label="เมนูสมุดคะแนน" className="overflow-x-auto border-t border-slate-100 px-2 sm:px-4">
          <div role="tablist" aria-label="มุมมองสมุดคะแนน" className="flex min-w-max gap-1">
            {gradebookTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeView === tab.id}
                aria-controls={`gradebook-panel-${tab.id}`}
                onClick={() => setActiveView(tab.id)}
                className={`relative min-h-11 px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 sm:px-4 ${
                  activeView === tab.id
                    ? "text-blue-700 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-blue-600"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </section>

      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {notice}
        </p>
      ) : null}

      {activeView === "overview" ? (
        <OverviewPanel gradebook={gradebook} />
      ) : null}

      {activeView === "settings" ? (
        <section
          id="gradebook-panel-settings"
          role="tabpanel"
          className="rounded-[18px] border border-[#E8EEF6] bg-white p-4 sm:p-5"
          aria-labelledby="category-heading"
        >
          <div>
            <h2 id="category-heading" className="text-lg font-bold text-slate-950">ตั้งค่าหมวดคะแนน</h2>
            <p className="mt-1 text-sm text-slate-500">ใช้จัดกลุ่มรายการคะแนนเท่านั้น ยังไม่มีน้ำหนักหรือการคำนวณเกรด</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {gradebook.categories.map((category, index) => (
              <form
                key={category.id}
                className={`rounded-2xl border p-3 ${categoryTones[index % categoryTones.length].card}`}
                onSubmit={(event) => {
                  event.preventDefault();
                  const name = new FormData(event.currentTarget).get("name");
                  void runMutation(
                    () => requestApi(`/api/score-categories/${category.id}`, { method: "PATCH", body: { name } }),
                    "แก้ไขหมวดคะแนนแล้ว",
                  );
                }}
              >
                <label className="sr-only" htmlFor={`category-${category.id}`}>ชื่อหมวด {category.name}</label>
                <input id={`category-${category.id}`} name="name" defaultValue={category.name} className={`${inputStyles} w-full`} />
                <div className="mt-3 flex justify-end gap-2">
                  <button type="button" disabled={pending} onClick={() => void runMutation(() => requestApi(`/api/score-categories/${category.id}`, { method: "DELETE" }), "ลบหมวดคะแนนแล้ว")} className="min-h-9 rounded-lg px-3 text-sm font-semibold text-red-700 transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">ลบ</button>
                  <button type="submit" disabled={pending} className="min-h-9 rounded-lg bg-white px-3 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">บันทึก</button>
                </div>
              </form>
            ))}
            <form onSubmit={createCategory} className="flex min-h-28 flex-col justify-between rounded-2xl border border-dashed border-blue-300 bg-blue-50/40 p-3">
              <label className="sr-only" htmlFor="new-category">ชื่อหมวดใหม่</label>
              <input id="new-category" name="name" required className={`${inputStyles} w-full`} placeholder="เช่น แบบฝึกหัด" />
              <button type="submit" disabled={pending} className="mt-3 min-h-9 self-end rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-60">+ เพิ่มหมวด</button>
            </form>
          </div>
        </section>
      ) : null}

      {activeView === "assessments" ? (
        <div id="gradebook-panel-assessments" role="tabpanel" className="space-y-4">
          <section className="rounded-[18px] border border-[#E8EEF6] bg-white p-4" aria-labelledby="score-import-heading">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="score-import-heading" className="font-bold text-slate-950">นำเข้าคะแนนจาก CSV</h2>
                <p className="mt-0.5 text-sm text-slate-500">เลือกรายการคะแนน แล้วอัปโหลดไฟล์ที่มีคอลัมน์ studentNumber,score</p>
              </div>
              <button type="button" onClick={() => { setShowScoreImport((current) => !current); setImportError(null); }} className="min-h-10 shrink-0 rounded-xl border border-blue-600 px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                {showScoreImport ? "ปิดการนำเข้า" : "นำเข้า CSV"}
              </button>
            </div>

            {showScoreImport ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                {gradebook.assessments.length > 0 ? (
                  <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto] lg:items-end">
                    <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700">
                      รายการคะแนนที่จะนำเข้า
                      <select
                        aria-label="รายการคะแนนสำหรับนำเข้า CSV"
                        value={importAssessmentId}
                        onChange={(event) => {
                          setImportAssessmentId(event.target.value);
                          setImportPreview([]);
                          setImportFileName(null);
                          setImportError(null);
                          if (scoreImportInputRef.current) scoreImportInputRef.current.value = "";
                        }}
                        className={`${inputStyles} w-full`}
                      >
                        {gradebook.assessments.map((assessment) => (
                          <option key={assessment.id} value={assessment.id}>{assessment.title} · เต็ม {assessment.maxScore}</option>
                        ))}
                      </select>
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <input ref={scoreImportInputRef} aria-label="ไฟล์ CSV คะแนนนักเรียน" type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => void selectScoreCsv(event)} />
                      <button type="button" onClick={() => scoreImportInputRef.current?.click()} disabled={pending || !importAssessmentId} className="min-h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50">เลือกไฟล์ CSV</button>
                      {importFileName ? <span className="max-w-64 truncate text-sm text-slate-600">{importFileName}</span> : null}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-amber-800">สร้างรายการคะแนนก่อน แล้วจึงนำเข้าคะแนนจาก CSV</p>
                )}

                <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800">
                  รองรับหัวคอลัมน์ <code>studentNumber,score</code> หรือ <code>รหัสนักเรียน,คะแนน</code> · คะแนนว่างจะถูกข้ามและไม่ลบคะแนนเดิม
                </div>
                {importError ? <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{importError}</p> : null}

                {importPreview.length > 0 ? (
                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="flex flex-col gap-2 border-b border-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-semibold text-slate-900">ตรวจพบคะแนนพร้อมนำเข้า {importPreview.length} คน</p>
                      <button type="button" onClick={() => void importScoreCsv()} disabled={pending} className="min-h-9 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white disabled:opacity-60">นำเข้าคะแนน {importPreview.length} คน</button>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500"><tr><th className="px-3 py-2">รหัสนักเรียน</th><th className="px-3 py-2">ชื่อ</th><th className="px-3 py-2 text-right">คะแนน</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                          {importPreview.map((record) => <tr key={record.studentId}><td className="px-3 py-2 font-mono text-xs">{record.studentNumber}</td><td className="px-3 py-2">{record.displayName}</td><td className="px-3 py-2 text-right font-semibold tabular-nums">{record.value}</td></tr>)}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          {gradebook.categories.length > 0 ? (
            <form onSubmit={createAssessment} className="grid gap-3 rounded-[18px] border border-[#E8EEF6] bg-white p-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_180px_160px_130px_auto] xl:items-end">
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700">ชื่อรายการ<input name="title" required className={inputStyles} placeholder="เช่น แบบฝึกหัดท้ายบท" /></label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700">หมวด<select name="categoryId" className={inputStyles}>{gradebook.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700">วันที่<input name="assessmentDate" type="date" required className={inputStyles} defaultValue={today} /></label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700">คะแนนเต็ม<input name="maxScore" type="number" min="0.01" step="0.01" required className={inputStyles} defaultValue="10" /></label>
              <button type="submit" disabled={pending} className="min-h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-60 md:col-span-2 xl:col-span-1">เพิ่มรายการ</button>
            </form>
          ) : (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">เพิ่มหมวดคะแนนในแท็บตั้งค่าคะแนนก่อนสร้างรายการ</p>
          )}

          <section className="overflow-hidden rounded-[18px] border border-[#E8EEF6] bg-white" aria-labelledby="assessment-list-heading">
            <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
              <h2 id="assessment-list-heading" className="font-bold text-slate-950">รายการคะแนน</h2>
              <p className="mt-0.5 text-sm text-slate-500">คะแนนด่วนและรายการคะแนนทั่วไปของชั้นเรียนนี้</p>
            </div>
            <div className="divide-y divide-slate-100">
              {gradebook.assessments.map((assessment) => {
                const category = gradebook.categories.find((item) => item.id === assessment.categoryId);
                return (
                  <article key={assessment.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-950">{assessment.title}</h3>
                        {assessment.classSessionId ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">คะแนนด่วน</span> : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{category?.name ?? "ไม่ระบุหมวด"} · {assessment.assessmentDate} · เต็ม {assessment.maxScore}</p>
                    </div>
                    <button type="button" onClick={() => setEditingAssessment(assessment)} className="min-h-9 self-start rounded-lg border border-blue-200 px-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 sm:self-auto">ดูรายละเอียด</button>
                  </article>
                );
              })}
              {gradebook.assessments.length === 0 ? <p className="p-8 text-center text-slate-500">ยังไม่มีรายการคะแนน</p> : null}
            </div>
          </section>
        </div>
      ) : null}

      {activeView === "student-scores" ? (
        <section id="gradebook-panel-student-scores" role="tabpanel" className="space-y-4" aria-labelledby="gradebook-table-heading">
          <CategoryStrip gradebook={gradebook} onAdd={() => setActiveView("settings")} />

          <section className="overflow-hidden rounded-[18px] border border-[#E8EEF6] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <h2 id="gradebook-table-heading" className="font-bold text-slate-950">คะแนนดิบ</h2>
                <p className="mt-0.5 text-sm text-slate-500">{gradebook.students.length} คน · {gradebook.assessments.length} รายการ · – หมายถึงยังไม่กรอก</p>
              </div>
              <button type="button" onClick={() => void saveScores()} disabled={pending || dirty.size === 0} className="min-h-10 shrink-0 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">บันทึกคะแนนที่เปลี่ยน</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
                <caption className="sr-only">สมุดคะแนนดิบ {gradebook.teachingContext.classroomName} วิชา {gradebook.teachingContext.subjectName}</caption>
                <thead>
                  <tr>
                    <th scope="col" rowSpan={2} className="sticky left-0 z-30 min-w-52 border-b border-r border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 shadow-[5px_0_10px_-10px_rgba(15,23,42,0.5)]">นักเรียน</th>
                    {assessmentGroups.map((group) => (
                      <th key={group.id} scope="colgroup" colSpan={group.assessments.length} className={`border-b border-r px-3 py-2 text-center text-xs font-bold ${group.tone.header}`}>{group.name}</th>
                    ))}
                  </tr>
                  <tr>
                    {orderedAssessments.map((assessment) => (
                      <th key={assessment.id} scope="col" className="min-w-36 border-b border-r border-slate-200 bg-white p-0 text-center">
                        <button type="button" aria-label={`เปิดรายละเอียด ${assessment.title}`} onClick={() => setEditingAssessment(assessment)} className="flex min-h-16 w-full flex-col items-center justify-center px-3 py-2 text-slate-900 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600">
                          <span className="max-w-36 truncate font-bold">{assessment.title}</span>
                          <span className="mt-0.5 text-xs font-normal text-slate-500">/{assessment.maxScore}</span>
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gradebook.students.map((student, rowIndex) => (
                    <tr key={student.studentId} className={rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <th scope="row" className={`sticky left-0 z-20 border-b border-r border-slate-100 px-4 py-3 shadow-[5px_0_10px_-10px_rgba(15,23,42,0.5)] ${rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                        <span className="block whitespace-nowrap font-semibold text-slate-950">{student.firstName} {student.lastName}</span>
                        <span className="font-mono text-xs font-normal text-slate-500">{student.studentNumber}</span>
                      </th>
                      {orderedAssessments.map((assessment) => {
                        const key = scoreKey(assessment.id, student.studentId);
                        return (
                          <td key={assessment.id} className="border-b border-r border-slate-100 px-3 py-2 text-center">
                            <input
                              aria-label={`${assessment.title} ของ ${student.firstName} ${student.lastName}`}
                              type="number"
                              min="0"
                              max={assessment.maxScore}
                              step="0.01"
                              value={scores[key] ?? ""}
                              onChange={(event) => {
                                setScores((current) => ({ ...current, [key]: event.target.value }));
                                setDirty((current) => new Set(current).add(key));
                              }}
                              className="min-h-10 w-20 rounded-lg border border-slate-300 bg-white px-2 text-right font-medium tabular-nums text-slate-900 outline-none transition placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-600/20"
                              placeholder="–"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {gradebook.assessments.length === 0 ? <p className="p-8 text-center text-slate-500">เพิ่มหมวดและรายการคะแนนเพื่อเริ่มกรอกคะแนนดิบ</p> : null}
          </section>
        </section>
      ) : null}

      {editingAssessment ? (
        <AssessmentDetailPanel
          assessment={editingAssessment}
          gradebook={gradebook}
          pending={pending}
          onClose={() => setEditingAssessment(null)}
          onSubmit={saveAssessment}
        />
      ) : null}
    </div>
  );
}

function CompactHeading() {
  return (
    <header>
      <h1 className="text-2xl font-bold tracking-tight text-slate-950">สมุดคะแนน</h1>
      <p className="mt-1 text-sm text-slate-500">บันทึกคะแนนดิบโดยแยกตามงานสอนของครู</p>
    </header>
  );
}

function CategoryStrip({ gradebook, onAdd }: { gradebook: GradebookResult; onAdd: () => void }) {
  return (
    <section aria-labelledby="score-category-strip-heading">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 id="score-category-strip-heading" className="text-sm font-bold text-slate-950">หมวดคะแนน</h2>
          <p className="text-xs text-slate-500">ใช้จัดกลุ่มเท่านั้น ไม่มีน้ำหนักคะแนน</p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {gradebook.categories.map((category, index) => {
          const count = gradebook.assessments.filter((assessment) => assessment.categoryId === category.id).length;
          const tone = categoryTones[index % categoryTones.length];
          return (
            <article key={category.id} className={`relative overflow-hidden rounded-xl border px-3 py-3 ${tone.card}`}>
              <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${tone.accent}`} />
              <p className={`truncate text-sm font-bold ${tone.heading}`}>{category.name}</p>
              <p className="mt-1 text-xs text-slate-600">{count} รายการคะแนน</p>
            </article>
          );
        })}
        <button type="button" onClick={onAdd} className="min-h-[66px] rounded-xl border border-dashed border-slate-300 bg-white px-3 text-sm font-semibold text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">+ เพิ่มหมวด</button>
      </div>
    </section>
  );
}

function OverviewPanel({ gradebook }: { gradebook: GradebookResult }) {
  return (
    <section id="gradebook-panel-overview" role="tabpanel" aria-label="ภาพรวมสมุดคะแนน" className="grid gap-3 sm:grid-cols-3">
      <article className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><p className="text-sm font-semibold text-blue-700">นักเรียน</p><p className="mt-1 text-2xl font-bold text-slate-950">{gradebook.students.length}</p><p className="text-xs text-slate-500">คนในชั้นเรียนนี้</p></article>
      <article className="rounded-2xl border border-violet-100 bg-violet-50 p-4"><p className="text-sm font-semibold text-violet-700">รายการคะแนน</p><p className="mt-1 text-2xl font-bold text-slate-950">{gradebook.assessments.length}</p><p className="text-xs text-slate-500">รวมคะแนนด่วนและงานคะแนน</p></article>
      <article className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-sm font-semibold text-emerald-700">หมวดคะแนน</p><p className="mt-1 text-2xl font-bold text-slate-950">{gradebook.categories.length}</p><p className="text-xs text-slate-500">ใช้จัดกลุ่มโดยไม่มีน้ำหนัก</p></article>
    </section>
  );
}

function AssessmentDetailPanel({ assessment, gradebook, pending, onClose, onSubmit }: {
  assessment: GradebookAssessmentResult;
  gradebook: GradebookResult;
  pending: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/25" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <aside role="dialog" aria-modal="true" aria-labelledby="assessment-panel-title" className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">รายละเอียดรายการคะแนน</p>
            <h2 id="assessment-panel-title" className="mt-1 text-xl font-bold text-slate-950">{assessment.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิดแผงรายละเอียด" className="grid size-10 shrink-0 place-items-center rounded-full border border-slate-200 text-xl leading-none text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">×</button>
        </div>

        {assessment.classSessionId ? <p className="mt-4 rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">รายการนี้สร้างจากคะแนนด่วนของคาบเรียน</p> : null}

        <form onSubmit={(event) => void onSubmit(event)} className="mt-5 space-y-4">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700">ชื่อรายการ<input name="title" required className={`${inputStyles} w-full`} defaultValue={assessment.title} /></label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700">หมวดคะแนน<select name="categoryId" className={`${inputStyles} w-full`} defaultValue={assessment.categoryId}>{gradebook.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700">คะแนนเต็ม<input name="maxScore" type="number" min="0.01" step="0.01" required className={`${inputStyles} w-full`} defaultValue={assessment.maxScore} /></label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700">วันที่<input name="assessmentDate" type="date" required className={`${inputStyles} w-full`} defaultValue={assessment.assessmentDate} /></label>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="min-h-10 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700">ยกเลิก</button>
            <button type="submit" disabled={pending} className="min-h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-60">บันทึกการแก้ไข</button>
          </div>
        </form>
      </aside>
    </div>
  );
}
