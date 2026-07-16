import type { SessionTimelineEventResult } from "@classroom-os/types";

const labels = {
  SESSION_STARTED: "เริ่มคาบเรียน",
  ATTENDANCE_UPDATED: "บันทึกการเข้าเรียน",
  ATTENDANCE_CORRECTED: "แก้ไขการเข้าเรียนหลังจบคาบ",
  SESSION_ENDED: "จบคาบเรียน",
  SESSION_CANCELLED: "ยกเลิกคาบเรียน",
} as const;

export function SessionTimeline({ events }: { events: SessionTimelineEventResult[] }) {
  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm" aria-labelledby="timeline-heading">
      <h2 id="timeline-heading" className="text-lg font-bold">ไทม์ไลน์คาบเรียน</h2>
      {events.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-[#6B7280]">กิจกรรมจะปรากฏเมื่อเริ่มคาบเรียน</p> : (
        <ol className="mt-4 space-y-4 border-l-2 border-blue-100 pl-5">
          {events.map((event) => (
            <li key={event.id} className="relative">
              <span className="absolute -left-[1.62rem] top-1 h-3 w-3 rounded-full bg-blue-600 ring-4 ring-white" aria-hidden="true" />
              <p className="font-semibold">{labels[event.eventType]}</p>
              <time className="mt-1 block text-xs text-[#6B7280]" dateTime={event.createdAt}>{new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.createdAt))}</time>
              {event.eventType === "ATTENDANCE_UPDATED" && typeof event.metadata.count === "number" ? <p className="mt-1 text-sm text-[#6B7280]">บันทึก {event.metadata.count} คน</p> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
