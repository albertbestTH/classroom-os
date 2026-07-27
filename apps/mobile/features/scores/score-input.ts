export type ScoreInputResult =
  | { kind: "empty" }
  | { kind: "valid"; value: number }
  | { kind: "invalid"; message: string };

export function parseScoreInput(rawValue: string, maxScore: number): ScoreInputResult {
  const raw = rawValue.trim();
  if (raw === "") return { kind: "empty" };
  if (!/^(?:\d+|\d*\.\d+)$/.test(raw)) {
    return { kind: "invalid", message: "กรอกคะแนนเป็นตัวเลขที่ถูกต้อง" };
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return { kind: "invalid", message: "คะแนนต้องเป็นตัวเลขที่ถูกต้อง" };
  }
  if (value < 0) return { kind: "invalid", message: "คะแนนต้องไม่ต่ำกว่า 0" };
  if (value > maxScore) return { kind: "invalid", message: `คะแนนต้องไม่เกิน ${maxScore}` };
  return { kind: "valid", value };
}
