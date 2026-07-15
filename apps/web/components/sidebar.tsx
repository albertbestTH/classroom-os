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
