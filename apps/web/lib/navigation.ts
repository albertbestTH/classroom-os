import type { CurrentUserResult, UserRole, WorkspaceType } from "@classroom-os/types";

export type NavigationItem = {
  label: string;
  shortLabel: string;
  href: string;
};

const managerItems: NavigationItem[] = [
  { label: "ภาพรวมโรงเรียน", shortLabel: "ภาพรวมโรงเรียน", href: "/" },
  { label: "นักเรียน", shortLabel: "นักเรียน", href: "/students" },
  { label: "บุคลากร", shortLabel: "บุคลากร", href: "/staff" },
  { label: "ห้องเรียน", shortLabel: "ห้องเรียน", href: "/classrooms" },
  { label: "รายวิชา", shortLabel: "วิชา", href: "/subjects" },
  { label: "ปีการศึกษา", shortLabel: "ปีการศึกษา", href: "/academic-years" },
  { label: "ภาคเรียน", shortLabel: "ภาคเรียน", href: "/terms" },
  { label: "ตารางสอน", shortLabel: "ตารางสอน", href: "/timetable" },
  { label: "เช็คชื่อ", shortLabel: "เช็คชื่อ", href: "/attendance" },
  { label: "สมุดคะแนน", shortLabel: "คะแนน", href: "/gradebook" },
  { label: "รายงานโรงเรียน", shortLabel: "รายงาน", href: "/reports" },
  { label: "นำเข้าข้อมูล", shortLabel: "นำเข้า", href: "/import" },
  { label: "เอกสาร", shortLabel: "เอกสาร", href: "/documents" },
];

const teacherItems: NavigationItem[] = [
  { label: "ภาพรวมการสอนของฉัน", shortLabel: "ภาพรวม", href: "/" },
  { label: "ชั้นเรียนของฉัน", shortLabel: "ชั้นเรียน", href: "/classrooms" },
  { label: "ตารางสอน", shortLabel: "ตารางสอน", href: "/timetable" },
  { label: "Live Class", shortLabel: "Live", href: "/live" },
  { label: "เช็คชื่อ", shortLabel: "เช็คชื่อ", href: "/attendance" },
  { label: "สมุดคะแนน", shortLabel: "คะแนน", href: "/gradebook" },
  { label: "รายงานของฉัน", shortLabel: "รายงาน", href: "/reports" },
  { label: "เอกสาร", shortLabel: "เอกสาร", href: "/documents" },
  { label: "โปรไฟล์", shortLabel: "โปรไฟล์", href: "/profile" },
];

const personalItems: NavigationItem[] = [
  teacherItems[0]!,
  { label: "นักเรียนของฉัน", shortLabel: "นักเรียน", href: "/students" },
  teacherItems[1]!,
  { label: "รายวิชาของฉัน", shortLabel: "วิชา", href: "/subjects" },
  { label: "ปีและภาคเรียน", shortLabel: "ภาคเรียน", href: "/academic-years" },
  { label: "ตั้งค่างานสอน", shortLabel: "งานสอน", href: "/personal-setup" },
  teacherItems[2]!, teacherItems[3]!, teacherItems[4]!, teacherItems[5]!, teacherItems[6]!, teacherItems[8]!,
  { label: "ตั้งค่าพื้นที่ส่วนตัว", shortLabel: "ตั้งค่า", href: "/settings" },
];

export function navigationForRole(role: UserRole, workspaceType: WorkspaceType = "SCHOOL"): NavigationItem[] {
  if (workspaceType === "PERSONAL" && role === "SCHOOL_OWNER") return personalItems;
  if (role === "TEACHER") return teacherItems;
  return [...managerItems, { label: "ตั้งค่า", shortLabel: "ตั้งค่า", href: "/settings" }];
}

export function navigationForUser(user: Pick<CurrentUserResult, "role" | "workspaceType">): NavigationItem[] {
  return navigationForRole(user.role, user.workspaceType);
}
