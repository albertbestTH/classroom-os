import type { UserRole } from "@classroom-os/types";

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

export function navigationForRole(role: UserRole): NavigationItem[] {
  if (role === "TEACHER") return teacherItems;
  return [...managerItems, { label: "ตั้งค่า", shortLabel: "ตั้งค่า", href: "/settings" }];
}
