import { downloadText } from "./download";
import { expect, test } from "@playwright/test";
import { createStudent, loginAdmin, requestParentLink } from "./api";

const unique = () => Math.random().toString(36).slice(2, 7).replace(/\d/g, "x");

test.describe("Admin: o'quvchilar", () => {
  test("BR-S03, T-185, T-078, T-110: yangi kirgan ko'rib chiqiladi, online qabul qilinadi, kartada kirish ochiladi", async ({
    page,
    request,
  }) => {
    const name = `Sardor ${unique()}ov`;
    await createStudent(request, { fullName: name, phone: "998901234567" });
    await loginAdmin(page, request, "students?filter=new");

    const inbox = page.getByTestId("inbox");
    await expect(inbox).toContainText("Koʻrib chiqish kerak");
    const card = page.getByTestId("newcomer").filter({ hasText: name });
    await expect(card).toContainText("+998901234567");
    await page.screenshot({ path: "e2e/.results/admin-students-inbox.png", fullPage: true });
    await card.getByRole("button", { name: "Online oʻquvchi" }).click();
    await expect(card).toHaveCount(0);

    // T-110: qabul qilingan, lekin to'lamagan o'quvchi "To'lamagan" ro'yxatida, belgi bilan
    await page.getByRole("tab", { name: "Toʻlamagan" }).click();
    await page.getByPlaceholder("Ism, username yoki telefon").fill(name);
    const unpaid = page.getByTestId("student").filter({ hasText: name });
    await expect(unpaid).toContainText("Obuna toʻlanmagan");
    await expect(unpaid).toContainText("ota-ona yoʻq");
    await page.screenshot({ path: "e2e/.results/admin-students-unpaid.png" });

    // Guruhsizlar chipida ham bor
    await page.getByRole("tab", { name: "Hammasi" }).click();
    await page.getByRole("button", { name: "Online (guruhsiz)" }).click();
    await expect(page.getByTestId("student").filter({ hasText: name })).toContainText("online");
    await page.screenshot({ path: "e2e/.results/admin-students.png", fullPage: true });

    // T-078: qidiruv natijasi Excel'ga, telefon matn ko'rinishida
    await expect(page.getByTestId("student")).toHaveCount(1);
    const csv = await downloadText(page, page.getByRole("button", { name: "Excelʼga yuklab olish" }));
    expect(csv.name).toBe("Oʻquvchilar.xlsx");
    expect(csv.text).toContain("Ism;Telegram;Telefon;Ota-ona telefoni;Guruh;Kirish;Obuna tugashi");
    expect(csv.text).toContain(`${name};`);
    expect(csv.text).toContain(";998 90 123 45 67;");

    // Kartada kirish rejimi
    await page.getByTestId("student").filter({ hasText: name }).click();
    const access = page.getByRole("combobox").first();
    await access.selectOption("FREE");
    await expect(access).toBeEnabled();
    await page.reload();
    await expect(page.getByRole("combobox").first()).toHaveValue("FREE");
  });
});

test.describe("Admin: begona o'quvchi", () => {
  test("T-185: begona yangi kirgan bloklanadi va ro'yxatda belgisi bor", async ({ page, request }) => {
    const name = `Begona ${unique()}ov`;
    await createStudent(request, { fullName: name, phone: "998901112299" });
    await loginAdmin(page, request, "students?filter=new");
    const card = page.getByTestId("newcomer").filter({ hasText: name });
    await card.getByRole("button", { name: "Bloklash" }).click();
    await expect(card).toHaveCount(0);
    await page.getByPlaceholder("Ism, username yoki telefon").fill(name);
    await expect(page.getByTestId("student").filter({ hasText: name })).toContainText("bloklangan");

    // T-187: kartada Sozlamalar tabidan sabab bilan qayta bloklash va chiqarish
    await page.getByTestId("student").filter({ hasText: name }).click();
    await expect(page.getByTestId("student")).toContainText("Bloklangan");
    await page.getByRole("tab", { name: "Sozlamalar" }).click();
    const control = page.getByTestId("block-control");
    await expect(control).toContainText("Bloklangan: Begona");
    await control.getByRole("button", { name: "Blokdan chiqarish" }).click();
    await control.getByRole("button", { name: "Bloklash…" }).click();
    await control.getByPlaceholder("Sabab (faqat sizga koʻrinadi)").fill("Toʻlov qilmadi");
    await control.getByRole("button", { name: "Bloklashni tasdiqlash" }).click();
    await expect(control).toContainText("Bloklangan: Toʻlov qilmadi");
    await page.screenshot({ path: "e2e/.results/admin-student-settings.png", fullPage: true });
    await page.getByRole("tab", { name: "Natijalar" }).click();
    await expect(page.getByText("Natija hali yoʻq")).toBeVisible();
    await page.screenshot({ path: "e2e/.results/admin-student-results.png", fullPage: true });
  });
});

test.describe("Admin: ota-onalar", () => {
  test("BR-S05, BR-S06: shubha belgisi ko'rinadi, rad etish sabab talab qiladi, tasdiqlash", async ({
    page,
    request,
  }) => {
    const a = await createStudent(request, { fullName: `Laylo ${unique()}va`, phone: "998935550001" });
    const bName = `Nodir ${unique()}ov`;
    const b = await createStudent(request, { fullName: bName, phone: "998935550002" });
    await requestParentLink(request, a.tg, "998935550001");
    await requestParentLink(request, b.tg, "998977770002");
    await loginAdmin(page, request, "parents");

    const suspicious = page.getByTestId("parent-link").filter({ hasText: "+998935550001" });
    await expect(suspicious.getByText("Raqami oʻquvchi raqami bilan bir xil")).toBeVisible();
    await suspicious.getByRole("button", { name: "Rad etish", exact: true }).click();
    const confirm = suspicious.getByRole("button", { name: "Rad etishni tasdiqlash" });
    await expect(confirm).toBeDisabled();
    await suspicious.getByPlaceholder("Sabab (ota-onaga yuboriladi)").fill("Raqam oʻquvchiniki");
    await confirm.click();
    await expect(suspicious).toHaveCount(0);

    const ok = page.getByTestId("parent-link").filter({ hasText: "+998977770002" });
    await ok.getByRole("button", { name: "Tasdiqlash" }).click();
    await expect(ok).toHaveCount(0);
    await page.getByRole("tab", { name: "Tasdiqlangan" }).click();
    await expect(page.getByTestId("parent-link").filter({ hasText: "+998977770002" })).toBeVisible();
    await page.getByRole("tab", { name: "Rad etilgan" }).click();
    await expect(page.getByText("Sabab: Raqam oʻquvchiniki").first()).toBeVisible();
    await page.screenshot({ path: "e2e/.results/admin-parents.png", fullPage: true });

    // T-123: tasdiqlangan ota-ona telefoni o'quvchi kartasida, qo'ng'iroq havolasi bilan
    await page.goto("http://127.0.0.1:5191/admin/students");
    await page.getByRole("tab", { name: "Hammasi" }).click();
    await page.getByPlaceholder("Ism, username yoki telefon").fill(bName);
    await page.getByTestId("student").filter({ hasText: bName }).click();
    const card = page.getByTestId("student");
    await expect(card.getByRole("link", { name: "+998977770002 ota-ona" })).toHaveAttribute(
      "href",
      "tel:+998977770002",
    );
    await page.screenshot({ path: "e2e/.results/admin-student-parent-phone.png" });
  });
});
