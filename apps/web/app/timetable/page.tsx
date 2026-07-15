import { AppShell } from "@/components/app-shell";

const days = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์"];
const slots = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00"];

export default function TimetablePage() {
  return (
    <AppShell>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-600">Weekly Schedule</p>
          <h2 className="mt-1 text-3xl font-bold">ตารางสอน</h2>
          <p className="mt-2 text-slate-500">สร้างและจัดการคาบเรียนรายสัปดาห์</p>
        </div>
        <button className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">+ เพิ่มคาบเรียน</button>
      </header>
      <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid min-w-[950px] grid-cols-[90px_repeat(5,1fr)] gap-2">
          <div />
          {days.map((day)=><div key={day} className="px-3 py-3 text-center font-semibold">{day}</div>)}
          {slots.map((time,row)=>(
            <div key={time} className="contents">
              <div className="px-3 py-5 text-sm font-semibold text-slate-500">{time}</div>
              {days.map((day,col)=>{
                const hasClass=(row+col)%3===0;
                return (
                  <div key={`${day}-${time}`} className="min-h-20 rounded-xl border border-slate-100 bg-slate-50 p-2">
                    {hasClass && <div className="h-full rounded-lg bg-blue-50 p-3 text-sm"><p className="font-semibold text-blue-700">ป.5/{(col%2)+1}</p><p className="mt-1 text-slate-600">คณิตศาสตร์</p></div>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
