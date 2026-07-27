"use client";

import type { CurrentUserResult } from "@classroom-os/types";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, CalendarRange, ChartNoAxesColumnIncreasing, ClipboardCheck, ClipboardPenLine, FileChartColumn, FileText, LayoutDashboard, MessageCircle, MonitorPlay, School, Settings, UsersRound, UserRound } from "lucide-react";

import { logoutAction } from "@/app/login/actions";
import { navigationForUser } from "@/lib/navigation";

const roleLabels: Record<CurrentUserResult["role"], string> = { SCHOOL_OWNER: "เจ้าของโรงเรียน", ADMIN: "ผู้ดูแลระบบ", TEACHER: "ครูผู้สอน" };
const workspaceLabels: Record<CurrentUserResult["role"], string> = { SCHOOL_OWNER: "พื้นที่บริหารโรงเรียน", ADMIN: "พื้นที่บริหารโรงเรียน", TEACHER: "พื้นที่ทำงานของครู" };

function isActiveRoute(pathname: string, href: string) { return href === "/" ? pathname === href : pathname.startsWith(href); }

function NavIcon({ href }: { href: string }) {
  const props = { size: 19, strokeWidth: 1.9, "aria-hidden": true } as const;
  if (href === "/") return <LayoutDashboard {...props} />;
  if (href.includes("timetable")) return <CalendarDays {...props} />;
  if (href.includes("students")) return <UsersRound {...props} />;
  if (href.includes("classrooms")) return <School {...props} />;
  if (href.includes("subjects")) return <BookOpen {...props} />;
  if (href.includes("academic-years") || href.includes("terms")) return <CalendarRange {...props} />;
  if (href.includes("personal-setup")) return <ClipboardPenLine {...props} />;
  if (href.includes("live")) return <MonitorPlay {...props} />;
  if (href.includes("gradebook")) return <ChartNoAxesColumnIncreasing {...props} />;
  if (href.includes("reports")) return <FileChartColumn {...props} />;
  if (href.includes("profile")) return <UserRound {...props} />;
  if (href.includes("attendance")) return <ClipboardCheck {...props} />;
  if (href.includes("documents")) return <FileText {...props} />;
  if (href.includes("settings")) return <Settings {...props} />;
  return <MessageCircle {...props} />;
}

function AccountSummary({ user }: { user: CurrentUserResult }) {
  return <div className="mt-auto rounded-2xl border border-blue-400/20 bg-blue-950/40 p-4">
    <div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-200 text-sm font-bold text-blue-900">{user.profileImageKey ? <img src={user.profileImageKey} alt={`รูปโปรไฟล์ของ ${user.firstName} ${user.lastName}`} className="h-full w-full object-cover" /> : user.firstName.slice(0, 1)}</span><p className="truncate text-sm font-semibold">{user.firstName} {user.lastName}</p></div>
    <p className="mt-1 truncate text-xs text-blue-200">{roleLabels[user.role]} · {user.schoolName}</p>
    <form action={logoutAction} className="mt-3"><button type="submit" className="min-h-11 w-full rounded-lg border border-blue-300/30 px-3 py-2 text-sm font-semibold text-blue-50 transition hover:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">ออกจากระบบ</button></form>
  </div>;
}

export function Sidebar({ currentUser }: { currentUser: CurrentUserResult }) {
  const pathname = usePathname();
  const navigationItems = navigationForUser(currentUser);
  return <>
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[216px] flex-col bg-[#0B3184] px-4 py-7 text-white lg:flex">
      <Link href="/" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300" aria-label="KradanDum หน้าหลัก">
        <span className="flex items-center gap-3"><Image src="/brand/kradandum-app-icon.png" alt="" width={40} height={40} className="rounded-xl" priority /><span className="text-lg font-bold tracking-tight">KradanDum</span></span>
        <span className="mt-1 block text-xs font-medium text-blue-200">ทุกวันเรียน จัดการได้ง่ายขึ้น</span>
        <span className="mt-3 block text-xs text-blue-200">{workspaceLabels[currentUser.role]}</span>
      </Link>
      <nav className="mt-8 flex-1 pr-1" aria-label={workspaceLabels[currentUser.role]}><ul className="space-y-2.5">{navigationItems.map((item) => { const active = isActiveRoute(pathname, item.href); return <li key={item.href}><Link href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${active ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30" : "text-blue-100 hover:bg-blue-900/70 hover:text-white"}`}><NavIcon href={item.href} />{item.label}</Link></li>; })}</ul></nav>
      <AccountSummary user={currentUser} />
    </aside>
    <header className="border-b border-slate-200 bg-white px-4 py-4 lg:hidden"><div className="flex items-center justify-between gap-3"><Link href="/" className="flex items-center gap-2 text-lg font-bold text-slate-900"><Image src="/brand/kradandum-app-icon.png" alt="" width={30} height={30} className="rounded-lg" priority /><span>KradanDum</span></Link><form action={logoutAction}><button type="submit" className="min-h-11 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">ออกจากระบบ</button></form></div></header>
    <nav className="sticky top-0 z-20 overflow-x-auto border-b border-slate-200 bg-white/95 px-3 backdrop-blur lg:hidden" aria-label="เมนูหลักบนมือถือ"><ul className="flex min-w-max gap-1">{navigationItems.map((item) => { const active = isActiveRoute(pathname, item.href); return <li key={item.href}><Link href={item.href} aria-current={active ? "page" : undefined} className={`block min-h-11 border-b-2 px-3 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 ${active ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-900"}`}>{item.shortLabel}</Link></li>; })}</ul></nav>
  </>;
}
