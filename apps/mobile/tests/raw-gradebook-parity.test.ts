const { readFileSync } = jest.requireActual("node:fs") as { readFileSync(path: string, encoding: string): string };
const { resolve } = jest.requireActual("node:path") as { resolve(...paths: string[]): string };
const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("mobile raw gradebook parity", () => {
  it("exposes assignment, assessment, and raw score screens", () => {
    expect(source("app/(tabs)/scores.tsx")).toContain("GradebookScreen");
    expect(source("features/scores/gradebook-screen.tsx")).toContain("/gradebook/[assignmentId]");
    expect(source("features/scores/assessment-list-screen.tsx")).toContain("คะแนนด่วน");
    expect(source("features/scores/assessment-score-screen.tsx")).toContain("value: parsed.kind === \"empty\" ? null : parsed.value");
  });

  it("uses the same gradebook API and supports decimal validation", () => {
    const list = source("features/scores/assessment-list-screen.tsx");
    const score = source("features/scores/assessment-score-screen.tsx");
    expect(list).toContain("/api/assessments?teachingAssignmentId=");
    expect(score).toContain("/api/assessments?teachingAssignmentId=");
    expect(score).toContain("parseScoreInput");
    expect(score).toContain('method: "PUT"');
  });

  it("uses a structured mobile gradebook presentation without changing assignment data", () => {
    const gradebook = source("features/scores/gradebook-screen.tsx");
    expect(gradebook).toContain("ชั้นเรียนและรายวิชา");
    expect(gradebook).toContain("classroomCount");
    expect(gradebook).toContain("subjectCount");
    expect(gradebook).toContain("<AssignmentCard");
    expect(gradebook).toContain("assignment.subjectCode");
    expect(gradebook).toContain("assignment.academicYearName");
    expect(gradebook).toContain('pathname: "/gradebook/[assignmentId]"');
  });

  it("keeps the selected-class assessment list visually consistent with the gradebook", () => {
    const list = source("features/scores/assessment-list-screen.tsx");
    expect(list).toContain("<HeroMetric");
    expect(list).toContain("<AssessmentCard");
    expect(list).toContain("assessment.scoreCount");
    expect(list).toContain("data.students.length");
    expect(list).toContain("formatAssessmentDate");
    expect(list).toContain("กลับไปสมุดคะแนน");
  });
});
