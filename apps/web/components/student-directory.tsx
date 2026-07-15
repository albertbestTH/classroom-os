"use client";

import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  ClassroomResult,
  CurrentUserResult,
  StudentResult,
  TeachingAssignmentResult,
} from "@classroom-os/types";
import { useEffect, useId, useState } from "react";

import { StatusBadge } from "@/components/status-badge";

type ClassroomOption = {
  key: string;
  classroomId: string;
  termId?: string;
  label: string;
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
  const classroomId = useId();
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<ClassroomOption[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [isTeacher, setIsTeacher] = useState(false);
  const [contextReady, setContextReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadContext() {
      setLoading(true);
      setError(null);
      try {
        const [user, classrooms, assignments] = await Promise.all([
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
        ]);
        const classroomNames = new Map(classrooms.map((item) => [item.id, item.name]));
        const teacher = user.role === "TEACHER";
        const nextOptions = teacher
          ? assignments.map((assignment) => ({
              key: `${assignment.classroomId}:${assignment.termId}`,
              classroomId: assignment.classroomId,
              termId: assignment.termId,
              label: classroomNames.get(assignment.classroomId) ?? assignment.classroomId,
            }))
          : classrooms.map((item) => ({
              key: item.id,
              classroomId: item.id,
              label: item.name,
            }));
        const uniqueOptions = [...new Map(nextOptions.map((item) => [item.key, item])).values()];
        setIsTeacher(teacher);
        setOptions(uniqueOptions);
        setSelectedKey(teacher ? uniqueOptions[0]?.key ?? "" : "");
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
  }, [contextReady, isTeacher, options, selectedKey]);

  const normalizedQuery = query.trim().toLocaleLowerCase("th");
  const filteredStudents = normalizedQuery
    ? students.filter((student) =>
        [student.studentNumber, student.firstName, student.lastName, student.preferredName ?? ""].some(
          (value) => value.toLocaleLowerCase("th").includes(normalizedQuery),
        ),
      )
    : students;
  const selectedClassroom = options.find((item) => item.key === selectedKey)?.label ?? "—";

  return (
    <section className="mt-8" aria-labelledby="student-list-heading">
      <div className="grid gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5 lg:grid-cols-2">
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
          <label htmlFor={classroomId} className="mb-2 block text-sm font-semibold text-[#111827]">
            ห้องเรียน
          </label>
          <select
            id={classroomId}
            value={selectedKey}
            onChange={(event) => setSelectedKey(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#111827] outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
          >
            {!isTeacher ? <option value="">ทุกห้องเรียน</option> : null}
            {options.map((option) => (
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
            <table className="w-full min-w-[820px] text-left text-sm">
              <caption className="sr-only">รายชื่อนักเรียนจากข้อมูลโรงเรียนที่ได้รับอนุญาต</caption>
              <thead className="bg-slate-50 text-[#6B7280]">
                <tr>
                  <th scope="col" className="px-5 py-3.5 font-semibold">รหัสนักเรียน</th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">ชื่อ–นามสกุล</th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">ห้องเรียน</th>
                  <th scope="col" className="px-5 py-3.5 text-right font-semibold">การมาเรียน</th>
                  <th scope="col" className="px-5 py-3.5 text-right font-semibold">คะแนนเฉลี่ย</th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="transition-colors hover:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-[#6B7280]">{student.studentNumber}</td>
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
    </section>
  );
}
