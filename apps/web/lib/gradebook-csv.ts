export type GradebookCsvStudent = {
  studentId: string;
  studentNumber: string;
  displayName: string;
};

export type GradebookCsvScore = {
  studentId: string;
  studentNumber: string;
  displayName: string;
  value: number;
};

const studentNumberHeaders = new Set(["studentnumber", "student_number", "รหัสนักเรียน"]);
const scoreHeaders = new Set(["score", "คะแนน"]);

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      cells.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }

  if (quoted) throw new Error("ไฟล์ CSV มีเครื่องหมายคำพูดไม่ครบคู่");
  cells.push(value.trim());
  return cells;
}

function normalizedHeader(value: string): string {
  return value.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/\s+/g, "");
}

export function parseGradebookScoreCsv(
  csv: string,
  students: GradebookCsvStudent[],
  maxScore: number,
): GradebookCsvScore[] {
  const lines = csv
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);
  if (lines.length < 2) throw new Error("ไฟล์ CSV ไม่มีข้อมูลคะแนน");

  const headers = parseCsvLine(lines[0]).map(normalizedHeader);
  const studentNumberIndex = headers.findIndex((header) => studentNumberHeaders.has(header));
  const scoreIndex = headers.findIndex((header) => scoreHeaders.has(header));
  if (studentNumberIndex < 0 || scoreIndex < 0) {
    throw new Error("หัวคอลัมน์ต้องมี studentNumber,score หรือ รหัสนักเรียน,คะแนน");
  }

  const studentByNumber = new Map(students.map((student) => [student.studentNumber.trim(), student]));
  const seen = new Set<string>();
  const records: GradebookCsvScore[] = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const cells = parseCsvLine(lines[lineIndex]);
    const studentNumber = cells[studentNumberIndex]?.trim() ?? "";
    const rawScore = cells[scoreIndex]?.trim() ?? "";
    if (!studentNumber) throw new Error(`แถวที่ ${lineIndex + 1} ไม่มีรหัสนักเรียน`);
    if (!rawScore) continue;
    if (seen.has(studentNumber)) throw new Error(`รหัสนักเรียน ${studentNumber} ซ้ำในไฟล์ CSV`);

    const student = studentByNumber.get(studentNumber);
    if (!student) throw new Error(`ไม่พบนักเรียนรหัส ${studentNumber} ในชั้นเรียนนี้`);
    const value = Number(rawScore);
    if (!Number.isFinite(value) || value < 0 || value > maxScore) {
      throw new Error(`คะแนนของ ${studentNumber} ต้องอยู่ระหว่าง 0 ถึง ${maxScore}`);
    }

    seen.add(studentNumber);
    records.push({
      studentId: student.studentId,
      studentNumber,
      displayName: student.displayName,
      value,
    });
  }

  if (records.length === 0) throw new Error("ไฟล์ CSV ไม่มีคะแนนที่พร้อมนำเข้า");
  return records;
}
