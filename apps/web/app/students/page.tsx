import { AppShell } from "@/components/app-shell";
import { students } from "@/data/mock-data";

export default function StudentsPage() {
  return (
    <AppShell>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-600">Student Management</p>
          <h2 className="mt-1 text-3xl font-bold">นักเรียน</h2>
          <p className="mt-2 text-slate-500">จัดการข้อมูลและติดตามภาพรวมนักเรียนทั้งหมด</p>
        </div>
        <button className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">+ เพิ่มนักเรียน</button>
      </header>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <input className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400" placeholder="ค้นหาชื่อ รหัสนักเรียน หรือห้องเรียน" />
      </div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>{["รหัส","ชื่อ–นามสกุล","ห้อง","การมาเรียน","คะแนนเฉลี่ย","สถานะ"].map((head)=><th key={head} className="px-5 py-4 font-semibold">{head}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student)=>(
                <tr key={student.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 text-slate-500">{student.id}</td>
                  <td className="px-5 py-4 font-semibold">{student.name}</td>
                  <td className="px-5 py-4">{student.className}</td>
                  <td className="px-5 py-4">{student.attendance}</td>
                  <td className="px-5 py-4">{student.average}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${student.status === "ปกติ" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{student.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
