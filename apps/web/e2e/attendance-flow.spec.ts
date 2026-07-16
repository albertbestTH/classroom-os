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

test.describe.serial("attendance workflow", () => {
  test("teacher starts, records, changes, saves, ends, and reviews a class", async ({ page }) => {
    await login(page, "teacher@synthetic.classroom.test");
    const materializeResponse = page.waitForResponse((response) => response.url().includes("/materialize"));
    await page.getByRole("button", { name: "เริ่มคาบเรียน" }).first().click();
    const materialized = await materializeResponse;
    expect(materialized.ok(), await materialized.text()).toBe(true);
    await expect(page).toHaveURL(/\/sessions\/[0-9a-f-]+$/, { timeout: 30_000 });
    await expect(page.getByText("LIVE · กำลังสอน")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("main").getByRole("link", { name: "เช็กชื่อ" }).click();
    await page.getByRole("button", { name: "ทำเครื่องหมายว่ามาทั้งหมด" }).click();
    await page.getByRole("main").getByText("สาย", { exact: true }).first().click();
    const saveResponse = page.waitForResponse((response) => /\/api\/sessions\/[^/]+\/attendance$/.test(response.url()));
    await page.getByRole("button", { name: "บันทึก" }).click();
    const saved = await saveResponse;
    expect(saved.ok(), await saved.text()).toBe(true);
    await expect(page.getByText(/บันทึกการเข้าเรียน 3 คนแล้ว/)).toBeVisible({ timeout: 15_000 });
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
    await expect(page.getByRole("heading", { name: "การเข้าเรียนวันนี้" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "แนวโน้ม 7 วัน" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "เปรียบเทียบชั้นเรียนที่รับผิดชอบ" })).toBeVisible();
    await expect(page.getByText("Synthetic Classroom A", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("Synthetic Classroom C (unassigned)", { exact: true })).toHaveCount(0);
    expect(consoleErrors).toEqual([]);
  });

  test("administrator reviews the school report and CSV action", async ({ page }) => {
    const consoleErrors = captureConsoleErrors(page);
    await page.context().clearCookies();
    await login(page, "admin@synthetic.classroom.test");
    await expect(page.getByText("ภาพรวมทั้งโรงเรียน", { exact: false }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "การเข้าเรียนทั้งโรงเรียนวันนี้" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "สถานะคาบวันนี้" })).toBeVisible();
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
