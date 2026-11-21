import { downloadText } from "./download";
import { expect, test } from "@playwright/test";
import { createStudent, loginAdmin, requestParentLink } from "./api";

const unique = () => Math.random().toString(36).slice(2, 7).replace(/\d/g, "x");

test.describe("Admin: o'quvchilar", () => {
  test("BR-S03, T-078, T-110: yangi o'quvchini qabul qiladi va kirishni ochadi", async ({
    page,
    request,
  }) => {
    const name = `Sardor ${unique()}ov`;
    await createStudent(request, { fullName: name, phone: "998901234567" });
    await loginAdmin(page, request, "students");

    const card = page.getByTestId("student").filter({ hasText: name });
    await expect(card).toBeVisible();
    await expect(card.getByText("+998901234567")).toBeVisible();
    await card.getByRole("button", { name: "Qabul qilish" }).click();
    await expect(card).toHaveCount(0);

    // T-110: qabul qilingan, lekin to'lamagan o'quvchi "To'lamagan" ro'yxatida, belgi bilan
    await page.getByRole("tab", { name: "Toʻlamagan" }).click();
    await page.getByPlaceholder("Ism, username yoki telefon").fill(name);
    const unpaid = page.getByTestId("student").filter({ hasText: name });
    await expect(unpaid.getByText("Obuna toʻlanmagan")).toBeVisible();
    await page.screenshot({ path: "e2e/.results/admin-students-unpaid.png" });

    await page.getByRole("tab", { name: "Hammasi" }).click();
    await page.getByPlaceholder("Ism, username yoki telefon").fill(name);
    const accepted = page.getByTestId("student").filter({ hasText: name });
    await expect(accepted.getByText("Qabul qilingan")).toBeVisible();
    await accepted.getByRole("combobox").selectOption("FREE");
    await expect(accepted.getByRole("combobox")).toBeEnabled();
    await page.reload();
    await page.getByRole("tab", { name: "Hammasi" }).click();
    await page.getByPlaceholder("Ism, username yoki telefon").fill(name);
    await expect(page.getByTestId("student").filter({ hasText: name }).getByRole("combobox")).toHaveValue(
      "FREE",
    );
    await page.screenshot({ path: "e2e/.results/admin-students.png", fullPage: true });

    // T-078: qidiruv natijasi Excel'ga, telefon matn ko'rinishida
    await expect(page.getByTestId("student")).toHaveCount(1);
    const csv = await downloadText(page, page.getByRole("button", { name: "Excel'ga yuklab olish" }));
    expect(csv.name).toBe("Oʻquvchilar.csv");
    expect(csv.text).toContain("Ism;Telegram;Telefon;Ota-ona telefoni;Guruh;Kirish;Obuna tugashi");
    expect(csv.text).toContain(`${name};`);
    expect(csv.text).toContain(";998 90 123 45 67;");
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
    const card = page.getByTestId("student").filter({ hasText: bName });
    await expect(card.getByRole("link", { name: "+998977770002 ota-ona" })).toHaveAttribute(
      "href",
      "tel:+998977770002",
    );
    await page.screenshot({ path: "e2e/.results/admin-student-parent-phone.png" });
  });
});
