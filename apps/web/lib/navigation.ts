import type { UserRole } from "@classroom-os/types";

export type NavigationItem = {
  label: string;
  shortLabel: string;
  href: string;
};

const dashboard = { label: "ภาพรวม", shortLabel: "ภาพรวม", href: "/" } as const;

const managerItems: NavigationItem[] = [
  dashboard,
  { label: "นักเรียน", shortLabel: "นักเรียน", href: "/students" },
  { label: "บุคลากร", shortLabel: "บุคลากร", href: "/staff" },
  { label: "ห้องเรียน", shortLabel: "ห้องเรียน", href: "/classrooms" },
  { label: "รายวิชา", shortLabel: "วิชา", href: "/subjects" },
  { label: "ตารางสอน", shortLabel: "ตารางสอน", href: "/timetable" },
  { label: "สมุดคะแนน", shortLabel: "คะแนน", href: "/gradebook" },
  { label: "รายงาน", shortLabel: "รายงาน", href: "/reports" },
];

const teacherItems: NavigationItem[] = [
  dashboard,
  { label: "ชั้นเรียนของฉัน", shortLabel: "ชั้นเรียน", href: "/classrooms" },
  { label: "ตารางสอน", shortLabel: "ตารางสอน", href: "/timetable" },
  { label: "เช็กชื่อ", shortLabel: "เช็กชื่อ", href: "/attendance" },
  { label: "สมุดคะแนน", shortLabel: "คะแนน", href: "/gradebook" },
];

export function navigationForRole(role: UserRole): NavigationItem[] {
  if (role === "TEACHER") return teacherItems;
  if (role === "SCHOOL_OWNER") {
    return [...managerItems, { label: "ตั้งค่า", shortLabel: "ตั้งค่า", href: "/settings" }];
  }
  return managerItems;
}
