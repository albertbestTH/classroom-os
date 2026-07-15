import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { timetableClasses, timetableDays, timetableSlots } from "@/data/mock-data";

export default function TimetablePage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="สัปดาห์ที่ 9 · 6–10 กรกฎาคม 2569"
        title="ตารางสอน"
        description="ตารางคาบเรียนวันจันทร์ถึงวันศุกร์"
        action={
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            + เพิ่มคาบเรียน
          </button>
        }
      />

      <section className="mt-8 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm" aria-labelledby="weekly-timetable-heading">
        <div className="border-b border-[#E5E7EB] px-5 py-4">
          <h2 id="weekly-timetable-heading" className="font-bold text-[#111827]">ตารางประจำสัปดาห์</h2>
          <p className="mt-1 text-sm text-[#6B7280]">เลื่อนในแนวนอนเพื่อดูวันอื่นบนหน้าจอขนาดเล็ก</p>
        </div>
        <div className="overflow-x-auto p-4 sm:p-5">
          <table className="w-full min-w-[980px] table-fixed border-separate border-spacing-2 text-left">
            <caption className="sr-only">ตารางสอนประจำสัปดาห์ วันจันทร์ถึงวันศุกร์</caption>
            <thead>
              <tr>
                <th scope="col" className="w-24 px-2 py-3 text-sm font-semibold text-[#6B7280]">เวลา</th>
                {timetableDays.map((day) => (
                  <th key={day} scope="col" className="px-3 py-3 text-center text-sm font-bold text-[#111827]">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timetableSlots.map((slot) => (
                <tr key={slot.time}>
                  <th scope="row" className="align-top px-2 py-3">
                    <span className="block text-sm font-bold text-[#111827]">{slot.time}</span>
                    <span className="mt-1 block text-xs font-normal text-[#6B7280]">{slot.endTime}</span>
                  </th>
                  {timetableDays.map((day) => {
                    const scheduledClass = timetableClasses.find(
                      (item) => item.day === day && item.time === slot.time,
                    );

                    return (
                      <td key={`${day}-${slot.time}`} className="h-28 rounded-xl border border-slate-100 bg-slate-50 p-2 align-top">
                        {scheduledClass ? (
                          <article className="h-full rounded-lg border border-blue-100 bg-blue-50 p-3">
                            <p className="text-sm font-bold text-blue-800">{scheduledClass.className}</p>
                            <p className="mt-1 text-sm font-medium text-[#111827]">{scheduledClass.subject}</p>
                            <p className="mt-2 text-xs text-[#6B7280]">ห้อง {scheduledClass.room}</p>
                          </article>
                        ) : (
                          <span className="sr-only">ไม่มีคาบเรียน</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
