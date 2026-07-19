import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { requireTeacherWebSession } from "@/lib/auth";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const { user } = await requireTeacherWebSession();
  return (
    <AppShell>
      <PageHeader eyebrow="พื้นที่ทำงานของครู" title="โปรไฟล์" description="ข้อมูลบัญชีและบทบาทการสอนของคุณ" />
      <ProfileForm initialUser={user} />
    </AppShell>
  );
}
