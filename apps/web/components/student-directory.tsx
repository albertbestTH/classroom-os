"use client";

import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  ClassroomResult,
  CurrentUserResult,
  StudentResult,
  TeachingAssignmentResult,
  TermResult,
} from "@classroom-os/types";
import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { StatusBadge } from "@/components/status-badge";
import { StudentRecordActions } from "@/components/student-record-actions";
import { parseStudentCsv } from "@/lib/student-csv";

type ClassroomOption = {
  key: string;
  classroomId: string;
  termId?: string;
  label: string;
  gradeLevel?: string;
};

type ImportResult = {
  kind: "success" | "error";
  title: string;
  message: string;
};

async function readApiData<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiSuccessResponse<T> | ApiErrorResponse;
  if (!response.ok || !("data" in body)) {
    throw new Error("ไม่สามารถโหลดข้อมูลได้");
  }
  return body.data;
}

export function StudentDirectory() {
  const searchId = useId();
  const gradeFilterId = useId();
  const classroomId = useId();
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<ClassroomOption[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [createGrade, setCreateGrade] = useState("");
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [isTeacher, setIsTeacher] = useState(false);
  const [contextReady, setContextReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [formClassroomKey, setFormClassroomKey] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importGrade, setImportGrade] = useState("");
  const [importClassroomKey, setImportClassroomKey] = useState("");
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ rollNumber: "", studentNumber: "", firstName: "", lastName: "", preferredName: "" });
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function loadContext() {
      setLoading(true);
      setError(null);
      try {
        const [user, classrooms, assignments, terms] = await Promise.all([
          fetch("/api/auth/session", { signal: controller.signal, cache: "no-store" }).then(
            (response) => readApiData<CurrentUserResult>(response),
          ),
          fetch("/api/classrooms", { signal: controller.signal, cache: "no-store" }).then(
            (response) => readApiData<ClassroomResult[]>(response),
          ),
          fetch("/api/teaching-assignments", {
            signal: controller.signal,
            cache: "no-store",
          }).then((response) => readApiData<TeachingAssignmentResult[]>(response)),
          fetch("/api/terms", { signal: controller.signal, cache: "no-store" }).then((response) => readApiData<TermResult[]>(response)),
        ]);
        const classroomMap = new Map(classrooms.map((item) => [item.id, item]));
        const teacher = user.role === "TEACHER";
        const nextOptions = teacher
          ? assignments.map((assignment) => ({
              key: `${assignment.classroomId}:${assignment.termId}`,
              classroomId: assignment.classroomId,
              termId: assignment.termId,
              label: classroomMap.get(assignment.classroomId)?.name ?? assignment.classroomId,
              gradeLevel: classroomMap.get(assignment.classroomId)?.gradeLevel,
            }))
          : classrooms.flatMap((item) => terms.filter((term) => term.isCurrent).map((term) => ({
              key: `${item.id}:${term.id}`,
              classroomId: item.id,
              termId: term.id,
              label: item.name,
              gradeLevel: item.gradeLevel,
            })));
        const uniqueOptions = [...new Map(nextOptions.map((item) => [item.key, item])).values()];
        setIsTeacher(teacher);
        setOptions(uniqueOptions);
        setSelectedKey(teacher ? uniqueOptions[0]?.key ?? "" : "");
        setFilterGrade(teacher ? uniqueOptions[0]?.gradeLevel ?? "" : "");
        setContextReady(true);
        if (teacher && uniqueOptions.length === 0) {
          setStudents([]);
          setLoading(false);
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "ไม่สามารถโหลดข้อมูลได้");
          setLoading(false);
        }
      }
    }
    void loadContext();
    return () => controller.abort();
  }, [retryKey]);

  useEffect(() => {
    const open = () => setShowCreate(true);
    window.addEventListener("students:create", open);
    const openFromHash = () => { if (window.location.hash === "#student-directory-actions") { setFormClassroomKey(selectedKey); setShowCreate(true); } };
    window.addEventListener("hashchange", openFromHash);
    openFromHash();
    return () => { window.removeEventListener("students:create", open); window.removeEventListener("hashchange", openFromHash); };
  }, [selectedKey]);

  useEffect(() => {
    if (!contextReady) return;
    const selected = options.find((item) => item.key === selectedKey);
    if (isTeacher && !selected) {
      return;
    }
    const controller = new AbortController();
    async function loadStudents() {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (selected) {
        params.set("classroomId", selected.classroomId);
        if (selected.termId) params.set("termId", selected.termId);
      }
      if (query.trim()) {
        params.set("query", query.trim());
      }
      try {
        const suffix = params.size > 0 ? `?${params.toString()}` : "";
        const response = await fetch(`/api/students${suffix}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        setStudents(await readApiData<StudentResult[]>(response));
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "ไม่สามารถโหลดข้อมูลได้");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadStudents();
    return () => controller.abort();
  }, [contextReady, isTeacher, options, selectedKey, query]);

  const normalizedQuery = query.trim().toLocaleLowerCase("th");
  const filteredStudents = normalizedQuery
    ? students.filter((student) =>
        [student.studentNumber, student.firstName, student.lastName, student.preferredName ?? ""].some(
          (value) => value.toLocaleLowerCase("th").includes(normalizedQuery),
        ),
      )
    : students;
  const selectedClassroom = options.find((item) => item.key === selectedKey)?.label ?? "—";

  const selected = options.find((item) => item.key === selectedKey);
  const gradeOptions = [...new Set(options.map((item) => item.gradeLevel).filter((value): value is string => Boolean(value)))];
  const visibleOptions = createGrade ? options.filter((item) => item.gradeLevel === createGrade) : options;
  const importOptions = importGrade ? options.filter((item) => item.gradeLevel === importGrade) : options;
  const filterRoomOptions = filterGrade ? options.filter((item) => item.gradeLevel === filterGrade) : options;
  async function createOne(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const destination = options.find((item) => item.key === formClassroomKey);
    if (!destination) { setNotice("กรุณาเลือกห้องเรียนและภาคเรียนก่อนเพิ่มนักเรียน"); return; }
    if (students.some((student) => student.studentNumber.trim().toLowerCase() === form.studentNumber.trim().toLowerCase())) {
      setNotice("รหัสนักเรียนนี้มีอยู่แล้วในโรงเรียน กรุณาใช้รหัสอื่น");
      return;
    }
    if (!selected && isTeacher) { setNotice("กรุณาเลือกห้องเรียนก่อนเพิ่มนักเรียน"); return; }
    setBusy(true); setNotice(null);
    try {
      const response = await fetch("/api/students", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentNumber: form.studentNumber, firstName: form.firstName, lastName: form.lastName, preferredName: form.preferredName.trim() || null, rollNumber: form.rollNumber ? Number(form.rollNumber) : undefined, classroomId: destination.classroomId, termId: destination.termId }) });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
        throw new Error(payload?.error?.message ?? `เพิ่มนักเรียนไม่สำเร็จ (${response.status})`);
      }
      setForm({ rollNumber: "", studentNumber: "", firstName: "", lastName: "", preferredName: "" }); setShowCreate(false); setNotice("เพิ่มนักเรียนเรียบร้อยแล้ว"); setRetryKey((value) => value + 1);
    } catch (error) { setNotice(error instanceof Error ? error.message : "เพิ่มนักเรียนไม่สำเร็จ"); } finally { setBusy(false); }
  }
  function selectImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedImportFile(file);
    setNotice(null);
  }

  async function importStudentsFromFile() {
    const file = selectedImportFile;
    if (!file) {
      const message = "กรุณาเลือกไฟล์ CSV ก่อนเริ่มนำเข้า";
      setImportResult({ kind: "error", title: "นำเข้าไม่สำเร็จ", message });
      return;
    }
    const destination = options.find((item) => item.key === importClassroomKey);
    if (!destination?.termId) {
      const message = "กรุณาเลือกชั้นเรียนและห้องเรียนปลายทางก่อนนำเข้า";
      setImportResult({ kind: "error", title: "นำเข้าไม่สำเร็จ", message });
      return;
    }
    let parsed;
    try {
      parsed = parseStudentCsv(await file.text());
    } catch (error) {
      const message = error instanceof Error ? error.message : "ไม่สามารถอ่านไฟล์ CSV ได้";
      setImportResult({ kind: "error", title: "นำเข้าไม่สำเร็จ", message });
      return;
    }
    setBusy(true); setNotice(null);
    let importedCount = 0;
    try {
      for (const row of parsed) {
        const response = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentNumber: row.studentNumber,
            firstName: row.firstName,
            lastName: row.lastName,
            preferredName: row.preferredName,
            dateOfBirth: row.dateOfBirth,
            rollNumber: row.rollNumber ?? undefined,
            classroomId: destination.classroomId,
            termId: destination.termId,
          }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null) as ApiErrorResponse | null;
          const detail = payload && "error" in payload ? payload.error.message : `HTTP ${response.status}`;
          const partial = importedCount > 0 ? ` นำเข้าแล้ว ${importedCount} คนก่อนพบข้อผิดพลาด` : "";
          throw new Error(`แถวที่ ${row.rowNumber} รหัส ${row.studentNumber}: ${detail}.${partial}`);
        }
        importedCount += 1;
      }
      const message = `นำเข้าสำเร็จ ${importedCount} คน ไปยัง ${destination.gradeLevel ? `${destination.gradeLevel} · ` : ""}${destination.label}`;
      setImportResult({ kind: "success", title: "นำเข้ารายชื่อนักเรียนสำเร็จ", message });
      setSelectedImportFile(null);
      if (importFileInputRef.current) importFileInputRef.current.value = "";
      setShowImport(false);
      setRetryKey((value) => value + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : "นำเข้าไม่สำเร็จ";
      setImportResult({ kind: "error", title: "นำเข้าไม่สำเร็จ", message });
      if (importedCount > 0) setRetryKey((value) => value + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8" aria-labelledby="student-list-heading">
      <div id="student-directory-actions" className="mb-4 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => { setFormClassroomKey(selectedKey); setShowImport(false); setShowCreate(true); }} className="min-h-11 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">+ เพิ่มนักเรียน</button>
        <button type="button" onClick={() => { setShowCreate(false); setShowImport((value) => !value); }} className="min-h-11 rounded-xl border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">นำเข้า CSV</button>
      </div>
      {notice ? <p className="mb-3 text-sm text-blue-700" role="status">{notice}</p> : null}
      {showImport ? <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <div className="mb-4">
          <h3 className="font-semibold text-slate-950">นำเข้ารายชื่อนักเรียนจาก CSV</h3>
          <p className="mt-1 text-sm text-slate-600">เลือกชั้นเรียนและห้องเรียนปลายทางก่อนเลือกไฟล์ รองรับหัวตารางภาษาไทยหรือ studentNumber, firstName, lastName สูงสุด 100 คน</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <select aria-label="ชั้นเรียนสำหรับนำเข้า CSV" value={importGrade} onChange={(event) => { setImportGrade(event.target.value); setImportClassroomKey(""); setSelectedImportFile(null); }} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3">
            <option value="">เลือกชั้นเรียน</option>
            {gradeOptions.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
          </select>
          <select aria-label="ห้องเรียนสำหรับนำเข้า CSV" value={importClassroomKey} onChange={(event) => { setImportClassroomKey(event.target.value); setSelectedImportFile(null); }} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3">
            <option value="">เลือกห้องเรียน</option>
            {importOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
          </select>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <input ref={importFileInputRef} aria-label="ไฟล์ CSV รายชื่อนักเรียน" type="file" accept=".csv,text/csv,text/tab-separated-values" className="hidden" onChange={selectImportFile} disabled={!importClassroomKey || busy} />
          <button type="button" onClick={() => importFileInputRef.current?.click()} disabled={!importClassroomKey || busy} className="min-h-11 rounded-xl border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">เลือกไฟล์ CSV</button>
          <button type="button" onClick={() => void importStudentsFromFile()} disabled={!selectedImportFile || busy} className="min-h-11 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{busy ? "กำลังนำเข้า…" : "เริ่มนำเข้า"}</button>
          <button type="button" onClick={() => { setSelectedImportFile(null); setShowImport(false); }} disabled={busy} className="min-h-11 rounded-xl border border-slate-300 px-5 disabled:opacity-50">ยกเลิก</button>
        </div>
        {selectedImportFile ? <p className="mt-3 text-sm text-slate-700" role="status">ไฟล์ที่เลือก: <span className="font-semibold">{selectedImportFile.name}</span></p> : null}
      </div> : null}
      {showCreate ? <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-5"><form onSubmit={createOne} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select aria-label="ชั้นเรียนสำหรับนักเรียนใหม่" value={createGrade} onChange={(e) => { setCreateGrade(e.target.value); setFormClassroomKey(""); }} className="min-h-11 rounded-xl border border-slate-200 px-3"><option value="">เลือกชั้นเรียน</option>{gradeOptions.map((grade) => <option key={grade} value={grade}>{grade}</option>)}</select>
        <select required aria-label="ห้องเรียนสำหรับนักเรียนใหม่" value={formClassroomKey} onChange={(e) => setFormClassroomKey(e.target.value)} className="min-h-11 rounded-xl border border-slate-200 px-3"><option value="">เลือกห้องเรียน</option>{visibleOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select>
        <input aria-label="เลขที่สำหรับนักเรียนใหม่" type="number" min="1" step="1" placeholder="เลขที่ (เว้นว่างเพื่อกำหนดอัตโนมัติ)" value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} className="min-h-11 rounded-xl border border-slate-200 px-3 sm:col-span-2 lg:col-span-4" />
        <input aria-label="รหัสนักเรียนใหม่" required placeholder="รหัสนักเรียน" value={form.studentNumber} onChange={(e) => setForm({ ...form, studentNumber: e.target.value })} className="min-h-11 rounded-xl border border-slate-200 px-3" />
        <input aria-label="ชื่อนักเรียนใหม่" required placeholder="ชื่อ" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="min-h-11 rounded-xl border border-slate-200 px-3" />
        <input aria-label="นามสกุลนักเรียนใหม่" required placeholder="นามสกุล" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="min-h-11 rounded-xl border border-slate-200 px-3" />
        <input aria-label="ชื่อเล่นนักเรียนใหม่" placeholder="ชื่อเล่น (ถ้ามี)" value={form.preferredName} onChange={(e) => setForm({ ...form, preferredName: e.target.value })} className="min-h-11 rounded-xl border border-slate-200 px-3" />
        <div className="flex gap-2 sm:col-span-2 lg:col-span-4"><button type="submit" disabled={busy} className="min-h-11 rounded-xl bg-blue-600 px-5 font-semibold text-white disabled:opacity-50">{busy ? "กำลังบันทึก…" : "บันทึกนักเรียน"}</button><button type="button" onClick={() => setShowCreate(false)} className="min-h-11 rounded-xl border border-slate-300 px-5">ยกเลิก</button></div>
      </form></div> : null}
      <div className="grid gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5 lg:grid-cols-3">
        <div>
          <label htmlFor={searchId} className="mb-2 block text-sm font-semibold text-[#111827]">
            ค้นหานักเรียน
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#111827] outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            placeholder="ค้นหาชื่อหรือรหัสนักเรียน"
          />
        </div>
        <div>
          <label htmlFor={gradeFilterId} className="mb-2 block text-sm font-semibold text-[#111827]">
            ชั้นเรียน
          </label>
          <select
            id={gradeFilterId}
            value={filterGrade}
            onChange={(event) => {
              const nextGrade = event.target.value;
              const nextRooms = nextGrade ? options.filter((option) => option.gradeLevel === nextGrade) : options;
              setFilterGrade(nextGrade);
              setSelectedKey(nextGrade || isTeacher ? nextRooms[0]?.key ?? "" : "");
            }}
            className="min-h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#111827] outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
          >
            {!isTeacher ? <option value="">ทุกชั้นเรียน</option> : null}
            {gradeOptions.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={classroomId} className="mb-2 block text-sm font-semibold text-[#111827]">
            ห้องเรียน
          </label>
          <select
            id={classroomId}
            value={selectedKey}
            onChange={(event) => setSelectedKey(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#111827] outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
          >
            {!isTeacher && !filterGrade ? <option value="">ทุกห้องเรียน</option> : null}
            {filterRoomOptions.map((option) => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
          <h2 id="student-list-heading" className="font-bold text-[#111827]">รายชื่อนักเรียน</h2>
          <p className="text-sm text-[#6B7280]">{filteredStudents.length} คน</p>
        </div>
        {loading ? (
          <div className="px-5 py-12 text-center text-sm text-[#6B7280]" role="status">
            กำลังโหลดข้อมูลนักเรียน…
          </div>
        ) : error ? (
          <div className="px-5 py-12 text-center" role="alert">
            <p className="text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => setRetryKey((value) => value + 1)}
              className="mt-4 min-h-11 rounded-xl border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              ลองอีกครั้ง
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <caption className="sr-only">รายชื่อนักเรียนจากข้อมูลโรงเรียนที่ได้รับอนุญาต</caption>
              <thead className="bg-slate-50 text-[#6B7280]">
                <tr>
                  <th scope="col" className="px-5 py-3.5 font-semibold">รหัสนักเรียน</th>
                  <th scope="col" className="px-5 py-3.5 text-center font-semibold">เลขที่</th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">ชื่อ–นามสกุล</th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">ห้องเรียน</th>
                  <th scope="col" className="px-5 py-3.5 text-right font-semibold">การมาเรียน</th>
                  <th scope="col" className="px-5 py-3.5 text-right font-semibold">คะแนนเฉลี่ย</th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">สถานะ</th>
                  {!isTeacher ? <th scope="col" className="px-5 py-3.5 font-semibold">จัดการ</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="transition-colors hover:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-[#6B7280]">{student.studentNumber}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-center font-semibold text-slate-700">{student.rollNumber ?? "—"}</td>
                    <th scope="row" className="whitespace-nowrap px-5 py-4 font-semibold text-[#111827]">
                      {student.firstName} {student.lastName}
                    </th>
                    <td className="whitespace-nowrap px-5 py-4">{selectedClassroom}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-right">—</td>
                    <td className="whitespace-nowrap px-5 py-4 text-right">—</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <StatusBadge variant={student.isActive ? "success" : "warning"}>
                        {student.isActive ? "ปกติ" : "ติดตาม"}
                      </StatusBadge>
                    </td>
                    {!isTeacher ? <td className="whitespace-nowrap px-5 py-2">
                      <StudentRecordActions
                        student={student}
                        classroom={selected?.termId ? { classroomId: selected.classroomId, termId: selected.termId, label: selected.label } : null}
                        onChanged={() => setRetryKey((value) => value + 1)}
                      />
                    </td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredStudents.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-[#6B7280]" role="status">
                ไม่พบข้อมูลนักเรียนในขอบเขตที่เลือก
              </div>
            ) : null}
          </div>
        )}
      </div>
      <button type="button" aria-label="กลับไปด้านบน" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="fixed bottom-6 right-6 z-20 inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-xl text-white shadow-lg hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">↑</button>
      {importResult ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-labelledby="student-import-result-title" aria-describedby="student-import-result-message">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">
          {importResult.kind === "success"
            ? <CheckCircle2 aria-hidden="true" className="mx-auto h-14 w-14 text-emerald-600" strokeWidth={1.9} />
            : <XCircle aria-hidden="true" className="mx-auto h-14 w-14 text-red-600" strokeWidth={1.9} />}
          <h2 id="student-import-result-title" className="mt-4 text-xl font-bold text-slate-950">{importResult.title}</h2>
          <p id="student-import-result-message" className="mt-2 text-sm leading-6 text-slate-600">{importResult.message}</p>
          <button type="button" onClick={() => setImportResult(null)} className={`mt-6 min-h-11 w-full rounded-xl px-5 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${importResult.kind === "success" ? "bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-600" : "bg-red-600 hover:bg-red-700 focus-visible:ring-red-600"}`}>ตกลง</button>
        </div>
      </div> : null}
    </section>
  );
}
