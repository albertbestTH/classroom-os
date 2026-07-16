import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { requireWebSession } from "@/lib/auth";

export default async function ReportsPage() {
  const { context } = await requireWebSession();
  const teacher = context.role === "TEACHER";
  return (
    <AppShell>
      <PageHeader eyebrow={teacher ? "พื้นที่ทำงานของครู" : "พื้นที่บริหารโรงเรียน"} title={teacher ? "รายงานของฉัน" : "รายงานโรงเรียน"} description={teacher ? "รายงานจากชั้นเรียนที่คุณได้รับมอบหมายเท่านั้น" : "รายงานระดับโรงเรียนที่สามารถกรองตามครู ชั้นเรียน วิชา และภาคเรียน"} />
      <div className="mt-8 rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">รายงานการเช็กชื่อ</h2>
        <p className="mt-2 text-sm text-[#6B7280]">{teacher ? "ระบบจะใช้โปรไฟล์ครูที่เข้าสู่ระบบโดยอัตโนมัติ" : "ค่าเริ่มต้นเป็นข้อมูลทั้งโรงเรียนและสามารถใช้ตัวกรองที่ได้รับอนุญาต"}</p>
        <Link href="/attendance" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">เปิดรายงานการเช็กชื่อ</Link>
      </div>
    </AppShell>
  );
}
