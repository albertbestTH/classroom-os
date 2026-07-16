import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { requireTeacherWebSession } from "@/lib/auth";

export default async function ProfilePage() {
  const { user } = await requireTeacherWebSession();
  return (
    <AppShell>
      <PageHeader eyebrow="พื้นที่ทำงานของครู" title="โปรไฟล์" description="ข้อมูลบัญชีและบทบาทการสอนของคุณ" />
      <dl className="mt-8 grid gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm sm:grid-cols-2">
        <div><dt className="text-sm text-[#6B7280]">ชื่อ</dt><dd className="mt-1 font-semibold">{user.firstName} {user.lastName}</dd></div>
        <div><dt className="text-sm text-[#6B7280]">อีเมล</dt><dd className="mt-1 font-semibold">{user.email}</dd></div>
        <div><dt className="text-sm text-[#6B7280]">โรงเรียน</dt><dd className="mt-1 font-semibold">{user.schoolName}</dd></div>
        <div><dt className="text-sm text-[#6B7280]">บทบาท</dt><dd className="mt-1 font-semibold">ครูผู้สอน</dd></div>
      </dl>
    </AppShell>
  );
}
