const { readFileSync } = jest.requireActual("node:fs") as {
  readFileSync(path: string, encoding: string): string;
};
const { resolve } = jest.requireActual("node:path") as {
  resolve(...paths: string[]): string;
};

describe("mobile attendance session guard", () => {
  const source = readFileSync(resolve(process.cwd(), "features/attendance/attendance-screen.tsx"), "utf8");

  it("allows scheduled and live editing but locks completed and cancelled sessions", () => {
    expect(source).toContain(
      'const readOnly = data.status === "completed" || data.status === "cancelled";',
    );
    expect(source).toContain("disabled={readOnly}");
    expect(source).toContain("{!readOnly ? <View");
  });
});
