export type StudentCsvRow = {
  rowNumber: number;
  rollNumber: number | null;
  studentNumber: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  dateOfBirth: string | null;
};

const headerAliases = {
  rollNumber: ["rollnumber", "roll_number", "เลขที่"],
  studentNumber: ["studentnumber", "student_number", "รหัสนักเรียน"],
  firstName: ["firstname", "first_name", "ชื่อ"],
  lastName: ["lastname", "last_name", "นามสกุล"],
  preferredName: ["preferredname", "preferred_name", "ชื่อเล่น"],
  dateOfBirth: ["dateofbirth", "date_of_birth", "วันเกิด"],
} as const;

type HeaderName = keyof typeof headerAliases;

function normalizeHeader(value: string): string {
  return value.replace(/^\uFEFF/, "").trim().toLocaleLowerCase("th");
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
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
    } else if (character === delimiter && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }

  if (quoted) {
    throw new Error("ไฟล์ CSV มีเครื่องหมายคำพูดไม่ครบคู่");
  }

  values.push(value.trim());
  return values;
}

function delimiterScore(line: string, delimiter: string): number {
  let score = 0;
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '"') {
      if (quoted && line[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (line[index] === delimiter && !quoted) {
      score += 1;
    }
  }
  return score;
}

function detectDelimiter(line: string): string {
  return [",", "\t", ";"].reduce((best, candidate) =>
    delimiterScore(line, candidate) > delimiterScore(line, best) ? candidate : best,
  );
}

function findHeaderIndex(headers: string[], name: HeaderName): number {
  return headers.findIndex((header) => headerAliases[name].includes(header as never));
}

export function parseStudentCsv(source: string): StudentCsvRow[] {
  const lines = source
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) throw new Error("ไฟล์ CSV ไม่มีข้อมูลนักเรียน");

  const delimiter = detectDelimiter(lines[0]);
  const firstRow = parseDelimitedLine(lines[0], delimiter);
  const normalizedFirstRow = firstRow.map(normalizeHeader);
  const hasHeader = findHeaderIndex(normalizedFirstRow, "studentNumber") >= 0;
  const headers = hasHeader ? normalizedFirstRow : [];
  const dataLines = hasHeader ? lines.slice(1) : lines;

  if (dataLines.length === 0) throw new Error("ไฟล์ CSV ไม่มีข้อมูลนักเรียน");
  if (dataLines.length > 100) throw new Error("นำเข้าได้ครั้งละไม่เกิน 100 คน");

  const indexes = hasHeader
    ? {
        studentNumber: findHeaderIndex(headers, "studentNumber"),
        rollNumber: findHeaderIndex(headers, "rollNumber"),
        firstName: findHeaderIndex(headers, "firstName"),
        lastName: findHeaderIndex(headers, "lastName"),
        preferredName: findHeaderIndex(headers, "preferredName"),
        dateOfBirth: findHeaderIndex(headers, "dateOfBirth"),
      }
    : { studentNumber: 0, firstName: 1, lastName: 2, preferredName: 3, dateOfBirth: 4, rollNumber: -1 };

  if (indexes.studentNumber < 0 || indexes.firstName < 0 || indexes.lastName < 0) {
    throw new Error("ไฟล์ต้องมีคอลัมน์ studentNumber, firstName และ lastName");
  }

  const seen = new Map<string, string>();
  return dataLines.map((line, dataIndex) => {
    const rowNumber = dataIndex + (hasHeader ? 2 : 1);
    const values = parseDelimitedLine(line, delimiter);
    const studentNumber = values[indexes.studentNumber]?.trim() ?? "";
    const firstName = values[indexes.firstName]?.trim() ?? "";
    const lastName = values[indexes.lastName]?.trim() ?? "";
    const rawRollNumber = indexes.rollNumber >= 0 ? values[indexes.rollNumber]?.trim() ?? "" : "";

    if (!studentNumber || !firstName || !lastName) {
      throw new Error(`แถวที่ ${rowNumber} ต้องมีรหัสนักเรียน ชื่อ และนามสกุล`);
    }

    const normalizedStudentNumber = studentNumber.toLocaleLowerCase("th");
    const firstStudentNumber = seen.get(normalizedStudentNumber);
    if (firstStudentNumber) {
      throw new Error(`รหัสนักเรียน ${firstStudentNumber} ซ้ำกันในไฟล์`);
    }
    seen.set(normalizedStudentNumber, studentNumber);

    const rollNumber = rawRollNumber ? Number(rawRollNumber) : null;
    if (rollNumber !== null && (!Number.isInteger(rollNumber) || rollNumber <= 0)) {
      throw new Error(`แถวที่ ${rowNumber} เลขที่ต้องเป็นจำนวนเต็มมากกว่า 0`);
    }

    return {
      rowNumber,
      rollNumber,
      studentNumber,
      firstName,
      lastName,
      preferredName: indexes.preferredName >= 0 ? values[indexes.preferredName]?.trim() || null : null,
      dateOfBirth: indexes.dateOfBirth >= 0 ? values[indexes.dateOfBirth]?.trim() || null : null,
    };
  });
}
