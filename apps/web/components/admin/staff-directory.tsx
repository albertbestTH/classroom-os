"use client";

import type { AccountStatus, StaffUserResult, UserRole } from "@classroom-os/types";
import Link from "next/link";
import { useId, useMemo, useState } from "react";

import { EmptyCollectionState } from "@/components/admin/admin-state";
import { StatusBadge } from "@/components/status-badge";

const roleLabels: Record<UserRole, string> = {
  SCHOOL_OWNER: "เจ้าของโรงเรียน",
  ADMIN: "ผู้ดูแลระบบ",
  TEACHER: "ครูผู้สอน",
};
const statusLabels: Record<AccountStatus, string> = { ACTIVE: "ใช้งาน", DISABLED: "ปิดใช้งาน" };

export type StaffDirectoryPage = {
  items: StaffUserResult[];
  nextCursor: string | null;
};

export function StaffDirectory({ page }: { page: StaffDirectoryPage }) {
  const searchId = useId();
  const roleId = useId();
  const statusId = useId();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<UserRole | "ALL">("ALL");
  const [status, setStatus] = useState<AccountStatus | "ALL">("ALL");
  const staff = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("th");
    return page.items.filter((item) => {
      const matchesQuery = !normalized ||
        `${item.firstName} ${item.lastName} ${item.email}`.toLocaleLowerCase("th").includes(normalized);
      return matchesQuery && (role === "ALL" || item.role === role) &&
        (status === "ALL" || item.status === status);
    });
  }, [page.items, query, role, status]);

  return (
    <section className="mt-8" aria-labelledby="staff-directory-heading">
      <div className="grid gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm md:grid-cols-3">
        <div>
          <label htmlFor={searchId} className="mb-2 block text-sm font-semibold">ค้นหาบุคลากร</label>
          <input id={searchId} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ชื่อหร​​ืออีเมล" className="min-h-11 w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20" />
        </div>
        <div>
          <label htmlFor={roleId} className="mb-2 block text-sm font-semibold">บทบาท</label>
          <select id={roleId} value={role} onChange={(event) => setRole(event.target.value as UserRole | "ALL")} className="min-h-11 w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20">
            <option value="ALL">ทุกบทบาท</option>
            <option value="SCHOOL_OWNER">เจ้าของโรงเรียน</option>
            <option value="ADMIN">ผู้ดูแลระบบ</option>
            <option value="TEACHER">ครูผู้สอน</option>
          </select>
        </div>
        <div>
          <label htmlFor={statusId} className="mb-2 block text-sm font-semibold">สถานะบัญชี</label>
          <select id={statusId} value={status} onChange={(event) => setStatus(event.target.value as AccountStatus | "ALL")} className="min-h-11 w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20">
            <option value="ALL">ทุกสถานะ</option>
            <option value="ACTIVE">ใช้งาน</option>
            <option value="DISABLED">ปิดใช้งาน</option>
          </select>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
          <h2 id="staff-directory-heading" className="font-bold">รายชื่อบุคลากร</h2>
          <p className="text-sm text-[#6B7280]">{staff.length} บัญชี</p>
        </div>
        {staff.length === 0 ? (
          <EmptyCollectionState title="ไม่พบบุคลากร" description="ลองเปลี่ยนคำค้นหาหรือตัวกรอง หรือเพิ่มบัญชีบุคลากรใหม่" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <caption className="sr-only">รายชื่อบัญชีบุคลากรที่ได้รับอนุญาตในโรงเรียน</caption>
              <thead className="bg-slate-50 text-[#6B7280]"><tr>
                <th scope="col" className="px-5 py-3.5 font-semibold">ชื่อ</th><th scope="col" className="px-5 py-3.5 font-semibold">บทบาท</th><th scope="col" className="px-5 py-3.5 font-semibold">สถานะ</th><th scope="col" className="px-5 py-3.5 font-semibold">โปรไฟล์ครู</th><th scope="col" className="px-5 py-3.5 text-right font-semibold">งานสอน</th><th scope="col" className="px-5 py-3.5"><span className="sr-only">การทำงาน</span></th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {staff.map((item) => <tr key={item.id} className="hover:bg-slate-50">
                  <th scope="row" className="px-5 py-4"><span className="block font-semibold">{item.firstName} {item.lastName}</span><span className="mt-1 block font-normal text-[#6B7280]">{item.email}</span></th>
                  <td className="px-5 py-4">{roleLabels[item.role]}</td>
                  <td className="px-5 py-4"><StatusBadge variant={item.status === "ACTIVE" ? "success" : "warning"}>{statusLabels[item.status]}</StatusBadge></td>
                  <td className="px-5 py-4">{item.role !== "TEACHER" ? "—" : item.teacherId ? (item.teacherIsActive ? "พร้อมใช้งาน" : "ปิดใช้งาน") : "ยังไม่มี"}</td>
                  <td className="px-5 py-4 text-right tabular-nums">{item.assignmentCount}</td>
                  <td className="px-5 py-4 text-right"><Link href={`/staff/${item.id}`} className="rounded-md font-semibold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">ดูรายละเอียด</Link></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
        {page.nextCursor ? <p className="border-t px-5 py-3 text-xs text-[#6B7280]">มีข้อมูลเพิ่มเติม</p> : null}
      </div>
    </section>
  );
}
