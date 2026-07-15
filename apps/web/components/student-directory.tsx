"use client";

import { useId, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import type { Student } from "@/data/mock-data";

type StudentDirectoryProps = {
  students: Student[];
};

export function StudentDirectory({ students }: StudentDirectoryProps) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("th");
  const filteredStudents = normalizedQuery
    ? students.filter((student) =>
        [student.id, student.name, student.className].some((value) =>
          value.toLocaleLowerCase("th").includes(normalizedQuery),
        ),
      )
    : students;

  return (
    <section className="mt-8" aria-labelledby="student-list-heading">
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
        <label htmlFor={searchId} className="mb-2 block text-sm font-semibold text-[#111827]">
          ค้นหานักเรียน
        </label>
        <div className="relative max-w-xl">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400" aria-hidden="true">
            ⌕
          </span>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-[#E5E7EB] bg-white py-3 pl-10 pr-4 text-sm text-[#111827] outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            placeholder="ค้นหาชื่อ รหัสนักเรียน หรือห้องเรียน"
          />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
          <h2 id="student-list-heading" className="font-bold text-[#111827]">รายชื่อนักเรียน</h2>
          <p className="text-sm text-[#6B7280]">{filteredStudents.length} คน</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <caption className="sr-only">รายชื่อนักเรียนและข้อมูลการเรียนโดยสรุป</caption>
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
                  <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-[#6B7280]">{student.id}</td>
                  <th scope="row" className="whitespace-nowrap px-5 py-4 font-semibold text-[#111827]">{student.name}</th>
                  <td className="whitespace-nowrap px-5 py-4">{student.className}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-right">{student.attendance}%</td>
                  <td className="whitespace-nowrap px-5 py-4 text-right font-semibold">{student.averageScore}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <StatusBadge variant={student.status === "ปกติ" ? "success" : "warning"}>
                      {student.status}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStudents.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-[#6B7280]" role="status">
              ไม่พบนักเรียนที่ตรงกับ “{query}”
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
