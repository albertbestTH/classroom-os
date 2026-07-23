export function formatElapsed(startedAt: string | null, now: number): string {
  if (!startedAt) return "00:00";
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1_000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function formatRemaining(scheduledEnd: string, now: number): string {
  const seconds = Math.max(0, Math.ceil((new Date(scheduledEnd).getTime() - now) / 1_000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
