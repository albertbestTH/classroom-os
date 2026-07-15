"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { label: "ภาพรวม", shortLabel: "ภาพรวม", href: "/" },
  { label: "นักเรียน", shortLabel: "นักเรียน", href: "/students" },
  { label: "ตารางสอน", shortLabel: "ตารางสอน", href: "/timetable" },
  { label: "สมุดคะแนน", shortLabel: "คะแนน", href: "/gradebook" },
] as const;

function isActiveRoute(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-[#111827] px-5 py-7 text-white lg:flex">
        <Link
          href="/"
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111827]"
          aria-label="Classroom OS หน้าภาพรวม"
        >
          <span className="block text-xl font-bold tracking-tight">Classroom OS</span>
          <span className="mt-1 block text-sm text-slate-400">พื้นที่ทำงานสำหรับครู</span>
        </Link>

        <nav className="mt-10" aria-label="เมนูหลัก">
          <ul className="space-y-2">
            {navigationItems.map((item) => {
              const active = isActiveRoute(pathname, item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-11 items-center rounded-xl px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111827] ${
                      active
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-auto rounded-2xl border border-slate-700 bg-slate-800/70 p-4">
          <p className="text-sm font-semibold">ภาคเรียนที่ 1/2569</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">ข้อมูลตัวอย่างสำหรับ Sprint 1</p>
        </div>
      </aside>

      <div className="border-b border-[#E5E7EB] bg-white px-4 py-4 lg:hidden">
        <Link
          href="/"
          className="inline-block rounded-md text-lg font-bold tracking-tight text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          Classroom OS
        </Link>
      </div>
      <nav className="sticky top-0 z-20 overflow-x-auto border-b border-[#E5E7EB] bg-white/95 px-3 backdrop-blur lg:hidden" aria-label="เมนูหลักบนมือถือ">
        <ul className="flex min-w-max gap-1">
          {navigationItems.map((item) => {
            const active = isActiveRoute(pathname, item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`block min-h-11 border-b-2 px-3 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 ${
                    active
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {item.shortLabel}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
