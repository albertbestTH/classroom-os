const stats = [
  { label: "คาบเรียนวันนี้", value: "5" },
  { label: "นักเรียนลา", value: "1" },
  { label: "งานยังไม่ครบ", value: "8" },
  { label: "เช็คชื่อสำเร็จ", value: "4/5" },
];

const lessons = [
  {
    time: "08:00",
    className: "ป.5/1",
    subject: "คณิตศาสตร์",
    status: "เสร็จแล้ว",
  },
  {
    time: "09:00",
    className: "ป.5/2",
    subject: "คณิตศาสตร์",
    status: "คาบถัดไป",
  },
  {
    time: "13:00",
    className: "ม.1/1",
    subject: "วิทยาศาสตร์",
    status: "รอเริ่ม",
  },
];

const tasks = [
  "กรอกคะแนน Quiz 2",
  "ยืนยันการลาของปวีณา",
  "ส่งออกรายงานประจำเดือน",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-col bg-slate-950 px-5 py-7 text-white lg:flex">
          <h1 className="text-xl font-bold">Classroom OS</h1>
          <p className="mt-1 text-sm text-slate-400">Teacher Workspace</p>

          <nav className="mt-10 space-y-2">
            {[
              "Dashboard",
              "Students",
              "Teachers",
              "Classes",
              "Subjects",
              "Timetable",
              "Attendance",
              "Gradebook",
              "Reports",
              "Settings",
            ].map((item, index) => (
              <button
                key={item}
                className={`w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                  index === 0
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>
        </aside>

        <section className="flex-1 px-6 py-8 lg:px-10">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                วันจันทร์ที่ 6 กรกฎาคม 2569
              </p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight">
                สวัสดีครับ ครูสมชาย
              </h2>
              <p className="mt-2 text-slate-500">
                ภาพรวมคาบเรียนและงานที่ต้องจัดการวันนี้
              </p>
            </div>

            <button className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
              + เพิ่มคาบเรียน
            </button>
          </header>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((item) => (
              <article
                key={item.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-3 text-3xl font-bold">{item.value}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">ตารางสอนวันนี้</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    คาบเรียนทั้งหมดของคุณในวันนี้
                  </p>
                </div>
                <button className="text-sm font-semibold text-blue-600">
                  ดูตารางทั้งหมด
                </button>
              </div>

              <div className="mt-6 divide-y divide-slate-100">
                {lessons.map((lesson) => (
                  <div
                    key={`${lesson.time}-${lesson.className}`}
                    className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center"
                  >
                    <div className="w-20 text-sm font-semibold text-slate-500">
                      {lesson.time}
                    </div>

                    <div className="flex-1">
                      <p className="font-semibold">
                        {lesson.className} · {lesson.subject}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        35 นักเรียน · ห้อง 501
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                      {lesson.status}
                    </span>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold">ต้องจัดการ</h3>
              <p className="mt-1 text-sm text-slate-500">
                งานที่ยังไม่เสร็จในวันนี้
              </p>

              <div className="mt-6 space-y-3">
                {tasks.map((task) => (
                  <button
                    key={task}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-4 text-left transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <span className="text-sm font-medium">{task}</span>
                    <span className="text-slate-400">›</span>
                  </button>
                ))}
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}