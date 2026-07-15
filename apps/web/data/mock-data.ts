export type StudentStatus = "ปกติ" | "ติดตาม";

export type Student = {
  id: string;
  name: string;
  className: string;
  attendance: number;
  averageScore: number;
  status: StudentStatus;
};

export type LessonStatus = "เสร็จแล้ว" | "คาบถัดไป" | "รอเริ่ม";

export type Lesson = {
  time: string;
  endTime: string;
  className: string;
  subject: string;
  room: string;
  studentCount: number;
  status: LessonStatus;
};

export type TimetableClass = {
  day: string;
  time: string;
  endTime: string;
  className: string;
  subject: string;
  room: string;
};

export type Assessment = {
  key: "quiz" | "homework" | "midterm" | "final";
  label: string;
  shortLabel: string;
  maxScore: number;
};

export type GradebookRecord = {
  studentId: string;
  studentName: string;
  scores: Record<Assessment["key"], number>;
};

export const dashboardStats = [
  { label: "คาบเรียนวันนี้", value: "5", detail: "เสร็จแล้ว 3 คาบ" },
  { label: "นักเรียนลา", value: "1", detail: "จากนักเรียน 102 คน" },
  { label: "งานยังไม่ครบ", value: "8", detail: "ต้องติดตามภายในวันนี้" },
  { label: "เช็กชื่อสำเร็จ", value: "4/5", detail: "เหลืออีก 1 คาบ" },
] as const;

export const todayLessons: Lesson[] = [
  {
    time: "08:00",
    endTime: "08:50",
    className: "ป.5/1",
    subject: "คณิตศาสตร์",
    room: "501",
    studentCount: 32,
    status: "เสร็จแล้ว",
  },
  {
    time: "09:00",
    endTime: "09:50",
    className: "ป.5/2",
    subject: "คณิตศาสตร์",
    room: "502",
    studentCount: 31,
    status: "คาบถัดไป",
  },
  {
    time: "13:00",
    endTime: "13:50",
    className: "ม.1/1",
    subject: "วิทยาศาสตร์",
    room: "ห้องวิทย์ 2",
    studentCount: 34,
    status: "รอเริ่ม",
  },
];

export const dashboardTasks = [
  { id: "task-1", title: "กรอกคะแนนแบบทดสอบครั้งที่ 2", meta: "ป.5/1 · ก่อน 16:00 น." },
  { id: "task-2", title: "ยืนยันการลาของ ด.ญ. มะลิ", meta: "ป.5/1 · รอตรวจสอบ" },
  { id: "task-3", title: "ส่งออกรายงานประจำเดือน", meta: "ครบกำหนดวันศุกร์" },
] as const;

export const students: Student[] = [
  { id: "ST-69001", name: "ด.ช. ธาม ธีรพงศ์", className: "ป.5/1", attendance: 98, averageScore: 88, status: "ปกติ" },
  { id: "ST-69002", name: "ด.ญ. มะลิ วัฒนสุข", className: "ป.5/1", attendance: 96, averageScore: 84, status: "ปกติ" },
  { id: "ST-69003", name: "ด.ช. ภูมิ พัฒนกิจ", className: "ป.5/1", attendance: 89, averageScore: 72, status: "ติดตาม" },
  { id: "ST-69004", name: "ด.ญ. พริม พราวฟ้า", className: "ป.5/1", attendance: 99, averageScore: 91, status: "ปกติ" },
  { id: "ST-69005", name: "ด.ญ. ใบข้าว สุขใจ", className: "ป.5/1", attendance: 91, averageScore: 76, status: "ติดตาม" },
  { id: "ST-69006", name: "ด.ช. นที แสงทอง", className: "ป.5/2", attendance: 97, averageScore: 86, status: "ปกติ" },
  { id: "ST-69007", name: "ด.ญ. อิงฟ้า เมฆงาม", className: "ป.5/2", attendance: 95, averageScore: 82, status: "ปกติ" },
];

export const timetableDays = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์"] as const;

export const timetableSlots = [
  { time: "08:00", endTime: "08:50" },
  { time: "09:00", endTime: "09:50" },
  { time: "10:00", endTime: "10:50" },
  { time: "11:00", endTime: "11:50" },
  { time: "13:00", endTime: "13:50" },
  { time: "14:00", endTime: "14:50" },
] as const;

export const timetableClasses: TimetableClass[] = [
  { day: "จันทร์", time: "08:00", endTime: "08:50", className: "ป.5/1", subject: "คณิตศาสตร์", room: "501" },
  { day: "จันทร์", time: "10:00", endTime: "10:50", className: "ป.5/2", subject: "คณิตศาสตร์", room: "502" },
  { day: "จันทร์", time: "13:00", endTime: "13:50", className: "ม.1/1", subject: "วิทยาศาสตร์", room: "วิทย์ 2" },
  { day: "อังคาร", time: "09:00", endTime: "09:50", className: "ป.5/2", subject: "คณิตศาสตร์", room: "502" },
  { day: "อังคาร", time: "11:00", endTime: "11:50", className: "ป.6/1", subject: "คณิตศาสตร์", room: "601" },
  { day: "พุธ", time: "08:00", endTime: "08:50", className: "ป.5/1", subject: "คณิตศาสตร์", room: "501" },
  { day: "พุธ", time: "13:00", endTime: "13:50", className: "ม.1/1", subject: "วิทยาศาสตร์", room: "วิทย์ 2" },
  { day: "พฤหัสบดี", time: "10:00", endTime: "10:50", className: "ป.6/1", subject: "คณิตศาสตร์", room: "601" },
  { day: "พฤหัสบดี", time: "14:00", endTime: "14:50", className: "ป.5/2", subject: "คณิตศาสตร์", room: "502" },
  { day: "ศุกร์", time: "09:00", endTime: "09:50", className: "ป.5/1", subject: "คณิตศาสตร์", room: "501" },
  { day: "ศุกร์", time: "11:00", endTime: "11:50", className: "ม.1/1", subject: "วิทยาศาสตร์", room: "วิทย์ 2" },
];

export const assessments: Assessment[] = [
  { key: "quiz", label: "แบบทดสอบครั้งที่ 1", shortLabel: "Quiz 1", maxScore: 10 },
  { key: "homework", label: "การบ้าน", shortLabel: "การบ้าน", maxScore: 20 },
  { key: "midterm", label: "สอบกลางภาค", shortLabel: "กลางภาค", maxScore: 30 },
  { key: "final", label: "สอบปลายภาค", shortLabel: "ปลายภาค", maxScore: 40 },
];

export const gradebookRecords: GradebookRecord[] = [
  { studentId: "ST-69001", studentName: "ด.ช. ธาม ธีรพงศ์", scores: { quiz: 9, homework: 18, midterm: 26, final: 36 } },
  { studentId: "ST-69002", studentName: "ด.ญ. มะลิ วัฒนสุข", scores: { quiz: 8, homework: 18, midterm: 25, final: 34 } },
  { studentId: "ST-69003", studentName: "ด.ช. ภูมิ พัฒนกิจ", scores: { quiz: 7, homework: 15, midterm: 22, final: 29 } },
  { studentId: "ST-69004", studentName: "ด.ญ. พริม พราวฟ้า", scores: { quiz: 10, homework: 19, midterm: 28, final: 38 } },
  { studentId: "ST-69005", studentName: "ด.ญ. ใบข้าว สุขใจ", scores: { quiz: 7, homework: 16, midterm: 23, final: 31 } },
  { studentId: "ST-69006", studentName: "ด.ช. นที แสงทอง", scores: { quiz: 9, homework: 17, midterm: 26, final: 35 } },
];

export function getTotalScore(scores: GradebookRecord["scores"]) {
  return Object.values(scores).reduce((total, score) => total + score, 0);
}

export function getLetterGrade(total: number) {
  if (total >= 90) return "A";
  if (total >= 85) return "B+";
  if (total >= 80) return "B";
  if (total >= 75) return "C+";
  if (total >= 70) return "C";
  if (total >= 65) return "D+";
  if (total >= 60) return "D";
  return "F";
}
