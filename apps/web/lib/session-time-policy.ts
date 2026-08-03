export type SessionStartWindow = "loading" | "too-early" | "available" | "expired";

export function sessionStartWindow(
  scheduledStart: string,
  scheduledEnd: string,
  now: number,
): SessionStartWindow {
  if (now === 0) return "loading";
  if (now < new Date(scheduledStart).getTime()) return "too-early";
  if (now >= new Date(scheduledEnd).getTime()) return "expired";
  return "available";
}

export function hasReachedScheduledEnd(scheduledEnd: string, now: number): boolean {
  return now > 0 && now >= new Date(scheduledEnd).getTime();
}

export function formatElapsedSessionTime(
  startedAt: string | null,
  scheduledStart: string,
  now: number,
): string {
  if (now === 0) return "00:00";
  const start = new Date(startedAt ?? scheduledStart).getTime();
  if (!Number.isFinite(start)) return "00:00";
  const seconds = Math.max(0, Math.floor((now - start) / 1_000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
