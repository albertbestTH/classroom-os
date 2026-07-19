import { expect, test, type Page } from "@playwright/test";

const password = "Classroom!Demo2026";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("อีเมล").fill(email);
  await page.getByLabel("รหัสผ่าน").fill(password);
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

function captureConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

function nextMonday(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  const today = new Date(Date.UTC(value("year"), value("month") - 1, value("day")));
  const isoWeekday = today.getUTCDay() || 7;
  const daysUntilMonday = ((1 - isoWeekday + 7) % 7) || 7;
  today.setUTCDate(today.getUTCDate() + daysUntilMonday);
  return today.toISOString().slice(0, 10);
}

async function startSyntheticSession(page: Page): Promise<string> {
  const timetableResponse = await page.request.get("/api/timetable");
  expect(timetableResponse.ok(), await timetableResponse.text()).toBe(true);
  const timetable = (await timetableResponse.json()) as { data: Array<{ id: string; room: string | null }> };
  const entry = timetable.data.find((item) => item.room === "SYN-E2E");
  expect(entry).toBeTruthy();

  const headers = { origin: "http://127.0.0.1:3100" };
  const materializedResponse = await page.request.post(`/api/timetable/${entry!.id}/materialize`, {
    data: { localDate: nextMonday() },
    headers,
  });
  expect(materializedResponse.ok(), await materializedResponse.text()).toBe(true);
  const materialized = (await materializedResponse.json()) as { data: { id: string } };
  const startResponse = await page.request.post(`/api/sessions/${materialized.data.id}/start`, {
    data: {},
    headers,
  });
  expect(startResponse.ok(), await startResponse.text()).toBe(true);
  return materialized.data.id;
}

test.describe.serial("attendance workflow", () => {
  test("teacher starts, records, changes, saves, ends, and reviews a class", async ({ page }) => {
    await login(page, "teacher@synthetic.classroom.test");
    const startedSessionId = await startSyntheticSession(page);
    await page.goto(`/sessions/${startedSessionId}`);
    await expect(page.getByText("LIVE · กำลังสอน")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("main").getByRole("link", { name: "เช็กชื่อ" }).click();
    await page.getByRole("button", { name: "ทำเครื่องหมายว่ามาทั้งหมด" }).click();
    await page.getByRole("main").getByText("สาย", { exact: true }).first().click();
    const saveResponse = page.waitForResponse((response) => /\/api\/sessions\/[^/]+\/attendance$/.test(response.url()));
    await page.getByRole("button", { name: "บันทึก" }).click();
    const saved = await saveResponse;
    expect(saved.ok(), await saved.text()).toBe(true);
    await expect(page.getByText(/บันทึกการเข้าเรียน 30 คนแล้ว/)).toBeVisible({ timeout: 15_000 });
    const sessionId = page.url().match(/sessions\/([^/]+)/)?.[1];
    expect(sessionId).toBeTruthy();
    await page.goto(`/sessions/${sessionId}`);
    await page.getByRole("button", { name: "จบคาบเรียน" }).click();
    const endResponse = page.waitForResponse((response) => response.url().endsWith(`/api/sessions/${sessionId}/end`));
    await page.getByRole("button", { name: "ยืนยันจบคาบ" }).click();
    const ended = await endResponse;
    expect(ended.ok(), await ended.text()).toBe(true);
    await expect(page).toHaveURL(new RegExp(`/sessions/${sessionId}/summary`), { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /Synthetic Mathematics/ })).toBeVisible();
  });

  test("teacher dashboard shows assigned analytics without console errors", async ({ page }) => {
    const consoleErrors = captureConsoleErrors(page);
    await page.context().clearCookies();
    await login(page, "teacher@synthetic.classroom.test");
    await expect(page.getByRole("heading", { name: "สวัสดีครับ ครูSynthetic" })).toBeVisible();
    await expect(page.getByRole("link", { name: "บุคลากร" })).toHaveCount(0);
    await expect(page.locator('select[name="teacherId"]')).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "การเข้าเรียนวันนี้" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "แนวโน้มส่วนตัว 7 วัน" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "เปรียบเทียบชั้นเรียนของฉัน" })).toBeVisible();
    await expect(page.getByText("Synthetic Classroom C (unassigned)", { exact: true })).toHaveCount(0);
    const classroomSelector = page.locator('select[name="classroomId"]');
    await expect(classroomSelector).toContainText("Synthetic Classroom A");
    await expect(classroomSelector).toContainText("Synthetic Classroom B");
    await expect(classroomSelector).not.toContainText("Synthetic Classroom C (unassigned)");
    await classroomSelector.selectOption({ label: "Synthetic Classroom B" });
    await expect(page.locator('select[name="subjectId"]')).toContainText("Synthetic Mathematics");
    await page.getByRole("button", { name: "ดูภาพรวม" }).click();
    await expect(page).toHaveURL(/classroomId=/);
    expect(consoleErrors).toEqual([]);
  });

  test("administrator reviews the school report and CSV action", async ({ page }) => {
    const consoleErrors = captureConsoleErrors(page);
    await page.context().clearCookies();
    await login(page, "admin@synthetic.classroom.test");
    await expect(page.getByRole("heading", { name: "ภาพรวมโรงเรียน" })).toBeVisible();
    const teacherSelector = page.locator('select[name="teacherId"]');
    await expect(teacherSelector).toBeVisible();
    await expect(page.getByText("ภาพรวมทั้งโรงเรียน", { exact: false }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "การเข้าเรียนทั้งโรงเรียนวันนี้" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "สถานะคาบวันนี้" })).toBeVisible();
    await teacherSelector.selectOption({ label: "Synthetic Teacher" });
    await page.getByRole("button", { name: "แสดงผล" }).click();
    await expect(page.getByRole("status").filter({ hasText: "กำลังดูข้อมูลของครู: Synthetic Teacher" })).toBeVisible();
    await page.goto("/staff");
    await expect(page.getByRole("heading", { name: "บุคลากร", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /เพิ่มบุคลากร/ })).toBeVisible();
    await page.goto("/attendance");
    await expect(page.getByRole("heading", { name: "ภาพรวมการเช็กชื่อ" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Synthetic Classroom A", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "ส่งออก CSV" })).toHaveAttribute("href", /api\/reports\/attendance\/export/);
    expect(consoleErrors).toEqual([]);
  });

  test("teacher cannot see unassigned classes or access an admin route", async ({ page }) => {
    await page.context().clearCookies();
    await login(page, "teacher@synthetic.classroom.test");
    await page.goto("/attendance");
    await expect(page.locator('select[name="classroomId"]')).not.toContainText("Synthetic Classroom C (unassigned)");
    await page.goto("/staff");
    await expect(page).toHaveURL(/\/$/);
  });
});
