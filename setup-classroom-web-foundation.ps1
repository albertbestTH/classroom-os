$ErrorActionPreference = "Stop"
$root = Join-Path (Get-Location) "apps\web"
$folders = @("components","data","app\students","app\timetable","app\gradebook")
foreach ($folder in $folders) { New-Item -ItemType Directory -Force -Path (Join-Path $root $folder) | Out-Null }

@'
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  ["Dashboard", "/"],
  ["Students", "/students"],
  ["Teachers", "/teachers"],
  ["Classes", "/classes"],
  ["Subjects", "/subjects"],
  ["Timetable", "/timetable"],
  ["Attendance", "/attendance"],
  ["Gradebook", "/gradebook"],
  ["Reports", "/reports"],
  ["Settings", "/settings"],
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-64 flex-col bg-slate-950 px-5 py-7 text-white lg:flex">
      <h1 className="text-xl font-bold">Classroom OS</h1>
      <p className="mt-1 text-sm text-slate-400">Teacher Workspace</p>
      <nav className="mt-10 space-y-2">
        {items.map(([label, href]) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                active ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
'@ | Set-Content -Encoding UTF8 (Join-Path $root "components\sidebar.tsx")

@'
import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar />
        <section className="min-w-0 flex-1 px-6 py-8 lg:px-10">{children}</section>
      </div>
    </main>
  );
}
'@ | Set-Content -Encoding UTF8 (Join-Path $root "components\app-shell.tsx")

@'
export const stats = [
  { label: "คาบเรียนวันนี้", value: "5" },
  { label: "นักเรียนลา", value: "1" },
  { label: "งานยังไม่ครบ", value: "8" },
  { label: "เช็คชื่อสำเร็จ", value: "4/5" },
];

export const lessons = [
  { time: "08:00", className: "ป.5/1", subject: "คณิตศาสตร์", status: "เสร็จแล้ว" },
  { time: "09:00", className: "ป.5/2", subject: "คณิตศาสตร์", status: "คาบถัดไป" },
  { time: "13:00", className: "ม.1/1", subject: "วิทยาศาสตร์", status: "รอเริ่ม" },
];

export const tasks = [
  "กรอกคะแนน Quiz 2",
  "ยืนยันการลาของปวีณา",
  "ส่งออกรายงานประจำเดือน",
];

export const students = [
  { id: "65001", name: "กิตติ สมบูรณ์", className: "ป.5/1", attendance: "98%", average: 88, status: "ปกติ" },
  { id: "65002", name: "สมชาย ใจดี", className: "ป.5/1", attendance: "96%", average: 84, status: "ปกติ" },
  { id: "65003", name: "สมหญิง รุ่งเรือง", className: "ป.5/1", attendance: "94%", average: 79, status: "ติดตาม" },
  { id: "65004", name: "ธนา วัฒนะ", className: "ป.5/1", attendance: "99%", average: 91, status: "ปกติ" },
  { id: "65005", name: "ปวีณา แสงทอง", className: "ป.5/1", attendance: "92%", average: 76, status: "ติดตาม" },
];
'@ | Set-Content -Encoding UTF8 (Join-Path $root "data\mock-data.ts")

@'
import { AppShell } from "@/components/app-shell";
import { lessons, stats, tasks } from "@/data/mock-data";

export default function Home() {
  return (
    <AppShell>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-600">วันจันทร์ที่ 6 กรกฎาคม 2569</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">สวัสดีครับ ครูสมชาย</h2>
          <p className="mt-2 text-slate-500">ภาพรวมคาบเรียนและงานที่ต้องจัดการวันนี้</p>
        </div>
        <button className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
          + เพิ่มคาบเรียน
        </button>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-3 text-3xl font-bold">{item.value}</p>
          </article>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">ตารางสอนวันนี้</h3>
              <p className="mt-1 text-sm text-slate-500">คาบเรียนทั้งหมดของคุณในวันนี้</p>
            </div>
            <a href="/timetable" className="text-sm font-semibold text-blue-600">ดูตารางทั้งหมด</a>
          </div>
          <div className="mt-6 divide-y divide-slate-100">
            {lessons.map((lesson) => (
              <div key={`${lesson.time}-${lesson.className}`} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center">
                <div className="w-20 text-sm font-semibold text-slate-500">{lesson.time}</div>
                <div className="flex-1">
                  <p className="font-semibold">{lesson.className} · {lesson.subject}</p>
                  <p className="mt-1 text-sm text-slate-500">35 นักเรียน · ห้อง 501</p>
                </div>
                <span className="w-fit rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">{lesson.status}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold">ต้องจัดการ</h3>
          <p className="mt-1 text-sm text-slate-500">งานที่ยังไม่เสร็จในวันนี้</p>
          <div className="mt-6 space-y-3">
            {tasks.map((task) => (
              <button key={task} className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-4 text-left hover:border-blue-200 hover:bg-blue-50">
                <span className="text-sm font-medium">{task}</span>
                <span className="text-slate-400">›</span>
              </button>
            ))}
          </div>
        </article>
      </div>
    </AppShell>
  );
}
'@ | Set-Content -Encoding UTF8 (Join-Path $root "app\page.tsx")

@'
import { AppShell } from "@/components/app-shell";
import { students } from "@/data/mock-data";

export default function StudentsPage() {
  return (
    <AppShell>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-600">Student Management</p>
          <h2 className="mt-1 text-3xl font-bold">นักเรียน</h2>
          <p className="mt-2 text-slate-500">จัดการข้อมูลและติดตามภาพรวมนักเรียนทั้งหมด</p>
        </div>
        <button className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">+ เพิ่มนักเรียน</button>
      </header>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <input className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400" placeholder="ค้นหาชื่อ รหัสนักเรียน หรือห้องเรียน" />
      </div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>{["รหัส","ชื่อ–นามสกุล","ห้อง","การมาเรียน","คะแนนเฉลี่ย","สถานะ"].map((head)=><th key={head} className="px-5 py-4 font-semibold">{head}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student)=>(
                <tr key={student.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 text-slate-500">{student.id}</td>
                  <td className="px-5 py-4 font-semibold">{student.name}</td>
                  <td className="px-5 py-4">{student.className}</td>
                  <td className="px-5 py-4">{student.attendance}</td>
                  <td className="px-5 py-4">{student.average}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${student.status === "ปกติ" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{student.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
'@ | Set-Content -Encoding UTF8 (Join-Path $root "app\students\page.tsx")

@'
import { AppShell } from "@/components/app-shell";

const days = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์"];
const slots = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00"];

export default function TimetablePage() {
  return (
    <AppShell>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-600">Weekly Schedule</p>
          <h2 className="mt-1 text-3xl font-bold">ตารางสอน</h2>
          <p className="mt-2 text-slate-500">สร้างและจัดการคาบเรียนรายสัปดาห์</p>
        </div>
        <button className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">+ เพิ่มคาบเรียน</button>
      </header>
      <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid min-w-[950px] grid-cols-[90px_repeat(5,1fr)] gap-2">
          <div />
          {days.map((day)=><div key={day} className="px-3 py-3 text-center font-semibold">{day}</div>)}
          {slots.map((time,row)=>(
            <div key={time} className="contents">
              <div className="px-3 py-5 text-sm font-semibold text-slate-500">{time}</div>
              {days.map((day,col)=>{
                const hasClass=(row+col)%3===0;
                return (
                  <div key={`${day}-${time}`} className="min-h-20 rounded-xl border border-slate-100 bg-slate-50 p-2">
                    {hasClass && <div className="h-full rounded-lg bg-blue-50 p-3 text-sm"><p className="font-semibold text-blue-700">ป.5/{(col%2)+1}</p><p className="mt-1 text-slate-600">คณิตศาสตร์</p></div>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
'@ | Set-Content -Encoding UTF8 (Join-Path $root "app\timetable\page.tsx")

@'
import { AppShell } from "@/components/app-shell";
import { students } from "@/data/mock-data";

export default function GradebookPage() {
  return (
    <AppShell>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-600">Assessment & Grades</p>
          <h2 className="mt-1 text-3xl font-bold">สมุดคะแนน</h2>
          <p className="mt-2 text-slate-500">ป.5/1 · คณิตศาสตร์ · ภาคเรียนที่ 1/2569</p>
        </div>
        <button className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">+ เพิ่มงาน</button>
      </header>
      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>{["นักเรียน","Quiz 1","Homework","กลางภาค","ปลายภาค","รวม","เกรด"].map((head)=><th key={head} className="px-5 py-4 font-semibold">{head}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student,index)=>{
                const total=89-index*3;
                const grade=total>=85?"A":total>=80?"B+":total>=75?"B":"C+";
                return (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold">{student.name}</td>
                    <td className="px-5 py-4">{8+(index%3)}</td>
                    <td className="px-5 py-4">{18-(index%4)}</td>
                    <td className="px-5 py-4">{24-(index%5)}</td>
                    <td className="px-5 py-4">{39-(index%6)}</td>
                    <td className="px-5 py-4 font-bold">{total}</td>
                    <td className="px-5 py-4"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{grade}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
'@ | Set-Content -Encoding UTF8 (Join-Path $root "app\gradebook\page.tsx")

Write-Host "Classroom OS web foundation created." -ForegroundColor Green
Write-Host "Routes: /  /students  /timetable  /gradebook" -ForegroundColor Cyan
