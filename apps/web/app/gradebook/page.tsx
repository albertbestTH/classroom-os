import { AppShell } from "@/components/app-shell";
import { students } from "@/data/mock-data";

export default function GradebookPage() {
  return (
    <AppShell>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-600">Assessment & Grades</p>
          <h2 className="mt-1 text-3xl font-bold">สมุดคะแนน</h2>
          <p className="mt-2 text-slate-500">ป.5/1 · คณิตศาสตร์ · ภาคเรียนที่ 1/2569</p>
        </div>
        <button className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">+ เพิ่มงาน</button>
      </header>
      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>{["นักเรียน","Quiz 1","Homework","กลางภาค","ปลายภาค","รวม","เกรด"].map((head)=><th key={head} className="px-5 py-4 font-semibold">{head}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student,index)=>{
                const total=89-index*3;
                const grade=total>=85?"A":total>=80?"B+":total>=75?"B":"C+";
                return (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold">{student.name}</td>
                    <td className="px-5 py-4">{8+(index%3)}</td>
                    <td className="px-5 py-4">{18-(index%4)}</td>
                    <td className="px-5 py-4">{24-(index%5)}</td>
                    <td className="px-5 py-4">{39-(index%6)}</td>
                    <td className="px-5 py-4 font-bold">{total}</td>
                    <td className="px-5 py-4"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{grade}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
