import { listClassrooms } from "@classroom-os/database";
import { EmptyCollectionState } from "@/components/admin/admin-state";
import { ClassroomManager } from "@/components/admin/classroom-manager";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { requireWebSession } from "@/lib/auth";
import { effectiveTeachingContext } from "@/lib/teaching-scope";

export default async function ClassroomsPage() {
  const { context, user } = await requireWebSession();
  const teachingContext = effectiveTeachingContext(context, user);
  const classrooms = await listClassrooms({ schoolId: context.schoolId, teacherId: teachingContext.role === "TEACHER" ? teachingContext.teacherId ?? undefined : undefined });
  if (context.role !== "TEACHER") return <AppShell><PageHeader eyebrow="โครงสร้างโรงเรียน" title="ห้องเรียน" description="จัดการห้องเรียน ระดับชั้น และสถานะการใช้งาน" /><ClassroomManager classrooms={classrooms} /></AppShell>;
  return <AppShell><PageHeader eyebrow="งานสอนของฉัน" title="ชั้นเรียนของฉัน" description="จัดการชั้นเรียนและห้องเรียนที่ได้รับมอบหมาย" /><section className="mt-8 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm" aria-labelledby="my-classes-heading"><div className="border-b px-5 py-4"><h2 id="my-classes-heading" className="font-bold">ชั้นเรียนที่ได้รับมอบหมาย</h2></div>{classrooms.length === 0 ? <EmptyCollectionState title="ยังไม่มีชั้นเรียน" description="ติดต่อผู้ดูแลระบบเพื่อเพิ่มงานสอนให้บัญชีของคุณ" /> : <ul className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">{classrooms.map((item) => <li key={item.id} className="rounded-xl border border-[#E5E7EB] p-4"><p className="text-xs text-[#6B7280]">ชั้นเรียน</p><p className="font-semibold">{item.gradeLevel}</p><p className="mt-3 text-xs text-[#6B7280]">ห้องเรียน</p><p className="font-semibold">{item.name}</p><p className="mt-1 text-sm text-[#6B7280]">รหัส {item.code}</p></li>)}</ul>}</section></AppShell>;
}
