export type ScoreInputResult = { kind: "empty" } | { kind: "valid"; value: number } | { kind: "invalid"; message: string };

export function parseScoreInput(value: string, maxScore: number): ScoreInputResult {
  const normalized = value.trim();
  if (!normalized) return { kind: "empty" };
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return { kind: "invalid", message: "กรอกคะแนนเป็นตัวเลขที่ถูกต้อง" };
  const score = Number(normalized);
  if (!Number.isFinite(score) || score < 0) return { kind: "invalid", message: "คะแนนต้องไม่น้อยกว่า 0" };
  if (score > maxScore) return { kind: "invalid", message: `คะแนนต้องไม่เกิน ${maxScore}` };
  return { kind: "valid", value: score };
}
