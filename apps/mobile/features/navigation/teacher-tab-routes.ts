export type TeacherTabKey = "today" | "timetable" | "scores" | "profile";

export function activeTeacherTab(pathname: string): TeacherTabKey {
  if (pathname.startsWith("/gradebook") || pathname === "/scores" || /\/sessions\/[^/]+\/scores$/.test(pathname)) return "scores";
  if (pathname.startsWith("/classes")) return "timetable";
  if (pathname.startsWith("/profile")) return "profile";
  return "today";
}
