import { parseScoreInput } from "@/features/scores/score-input";

describe("quick score input", () => {
  it.each([
    ["", { kind: "empty" }],
    ["0", { kind: "valid", value: 0 }],
    ["10", { kind: "valid", value: 10 }],
    ["7.5", { kind: "valid", value: 7.5 }],
  ])("accepts %s", (raw, expected) => expect(parseScoreInput(raw, 10)).toEqual(expected));

  it.each(["10.1", "-1", "abc", "1.2.3", "NaN", "Infinity"])("rejects %s", (raw) => {
    expect(parseScoreInput(raw, 10).kind).toBe("invalid");
  });

  it("marks an existing persisted score above the maximum as invalid", () => {
    expect(parseScoreInput("15", 10)).toEqual({ kind: "invalid", message: "คะแนนต้องไม่เกิน 10" });
  });
});
