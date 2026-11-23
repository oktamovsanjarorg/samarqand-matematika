import { expect, test, type APIRequestContext } from "@playwright/test";
import type { TutorChatView } from "@samarqand/shared";
import { adminHeaders, apiPost, createStudent, grantFree } from "./api";
import { E2E_PREFIX, openAsTelegram } from "./telegram";
import { notebookPng, seedWeekly, solveWeekly } from "./weekly-seed";

/** Nashr qilingan mavzu va bitta savol, to'liq kirishli o'quvchi */
async function seed(request: APIRequestContext) {
  const admin = await adminHeaders(request);
  const course = await apiPost<{ id: string }>(request, "/admin/courses", admin, {
    title: `${E2E_PREFIX}Yordamchi ${Date.now()}`,
    isPublished: true,
  });
  const topic = await apiPost<{ id: string }>(request, `/admin/courses/${course.id}/topics`, admin, {
    title: "Kasrlar",
  });
  await apiPost(request, `/admin/topics/${topic.id}/questions`, admin, {
    type: "NUMERIC",
    text: "$\\frac{1}{2} + \\frac{1}{4}$ = ?",
    answer: { value: "3/4" },
    isPublished: true,
  });
  const s = await createStudent(request, { fullName: "Yordamchi Sinov", phone: "998901112231" });
  await grantFree(request, admin, "Yordamchi Sinov");

  return { s, topic };
}

test("BR-T02: mavzu testi savolida yordamchi; AI javob bermasa matn saqlanadi; javob formulasi bilan chiqadi", async ({
  page,
  request,
}) => {
  const { s, topic } = await seed(request);
  await openAsTelegram(page, { id: s.tg, first_name: "Sinov" }, `/topics/${topic.id}/test`);
  await page.getByRole("button", { name: "Yordamchi" }).click();
  const tutor = page.getByTestId("tutor");
  await expect(tutor).toContainText("javobni aytmaydi");
  await expect(tutor).toContainText("Bugun yana 30 ta savol");

  // e2e muhitida AI o'chiq: server 503, yozilgan matn yo'qolmaydi
  const box = page.getByLabel("Yordamchiga xabar");
  await box.fill("Qaysi formuladan boshlayman?");
  await page.getByRole("button", { name: "Yuborish" }).click();
  await expect(page.getByRole("alert")).toContainText("Yordamchi hozir javob bera olmadi");
  await expect(box).toHaveValue("Qaysi formuladan boshlayman?");

  // AI javobi (API testlarida provayder bilan tekshirilgan): UI faqat ko'rsatishni sinaydi
  await page.route("**/api/tutor/chats/*/messages", async (route) => {
    const id = route.request().url().split("/").at(-2) ?? "";
    const view: TutorChatView = {
      id,
      mode: "PRACTICE",
      remaining: 29,
      messages: [
        {
          id: "m1",
          role: "USER",
          text: "Qaysi formuladan boshlayman?",
          photoId: null,
          createdAt: new Date().toISOString(),
        },
        {
          id: "m2",
          role: "ASSISTANT",
          text: "Maxrajlarni tenglashtir: $\\frac{1}{2} = \\frac{?}{4}$. Nechta chiqadi?",
          photoId: null,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    await route.fulfill({ json: view });
  });
  await page.getByRole("button", { name: "Yuborish" }).click();
  const reply = page.getByTestId("tutor-reply");
  await expect(reply).toContainText("Maxrajlarni tenglashtir");
  await expect(reply.locator(".katex").first()).toBeVisible();
  await expect(box).toHaveValue("");
  await expect(tutor).toContainText("Bugun yana 29 ta savol");
  await page.screenshot({ path: "e2e/.results/miniapp-tutor.png", fullPage: true });

  await page.unroute("**/api/tutor/chats/*/messages");
  await openAsTelegram(page, { id: s.tg, first_name: "Sinov" }, "/");
  await page.getByTestId("tutor-home").click();
  await expect(page.getByRole("heading", { name: "AI yordamchi" })).toBeVisible();
  await expect(page.getByTestId("tutor")).toContainText("Matematikadan savol yoz");
});

test("BR-T01: haftalik test yopilgach noto'g'ri savol ostida xato tahlili ochiladi", async ({
  page,
  request,
  browser,
}) => {
  const { admin, id, close } = await seedWeekly(request);
  const s = await createStudent(request, { fullName: "Tahlil Sinov", phone: "998901112232" });
  await grantFree(request, admin, "Tahlil Sinov");
  await solveWeekly(request, s, { testId: id, png: await notebookPng(browser) });
  expect((await close()).ok()).toBe(true);

  await openAsTelegram(page, { id: s.tg, first_name: "Tahlil" }, `/weekly/${id}`);
  // 1-savol to'g'ri: tugma yo'q; 2-savol xato: bitta tugma
  await expect(page.getByRole("button", { name: "Xatoni tushuntir" })).toHaveCount(1);
  await page.getByRole("button", { name: "Xatoni tushuntir" }).click();
  await expect(page.getByTestId("tutor")).toContainText("Xatoni birga koʻrib chiqamiz");
  await expect(page.getByLabel("Yordamchiga xabar")).toBeVisible();
});

test("BR-T06, T-171: erkin savolga masala rasmi; AI javob bermasa rasm qoladi; yuborilgan rasm suhbatda ko'rinadi", async ({
  page,
  request,
  browser,
}) => {
  const { s } = await seed(request);
  const png = await notebookPng(browser);
  await openAsTelegram(page, { id: s.tg, first_name: "Sinov" }, "/tutor");
  const tutor = page.getByTestId("tutor");
  await expect(tutor).toContainText("Matematikadan savol yoz");
  const send = page.getByRole("button", { name: "Yuborish" });
  await expect(send).toBeDisabled();
  await page
    .getByLabel("Rasm tanlash")
    .setInputFiles({ name: "masala.png", mimeType: "image/png", buffer: png });
  await expect(page.getByTestId("tutor-preview")).toBeVisible();
  await expect(send).toBeEnabled();

  // e2e muhitida AI o'chiq: rasm serverga yuklanadi, xabar 503, rasm tanlovi qoladi
  const upload = page.waitForResponse((r) => r.url().includes("/photos") && r.request().method() === "POST");
  await send.click();
  expect((await upload).status()).toBe(201);
  await expect(page.getByRole("alert")).toContainText("Yordamchi hozir javob bera olmadi");
  await expect(page.getByTestId("tutor-preview")).toBeVisible();

  // AI javobi soxta, rasm esa haqiqiy yuklangan (o'quvchi o'z rasmini ko'radi)
  await page.route("**/api/tutor/chats/*/messages", async (route) => {
    const id = route.request().url().split("/").at(-2) ?? "";
    const body = route.request().postDataJSON() as { text: string; photoId?: string };
    const view: TutorChatView = {
      id,
      mode: "FREE",
      remaining: 29,
      messages: [
        {
          id: "m1",
          role: "USER",
          text: body.text,
          photoId: body.photoId ?? null,
          createdAt: new Date().toISOString(),
        },
        {
          id: "m2",
          role: "ASSISTANT",
          text: "Shartda nima berilgan?",
          photoId: null,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    await route.fulfill({ json: view });
  });
  await page.getByLabel("Yordamchiga xabar").fill("Shu masala");
  await send.click();
  await expect(page.getByTestId("tutor-photo")).toBeVisible();
  await expect(page.getByTestId("tutor-preview")).toHaveCount(0);
  await expect(tutor).toContainText("Shu masala");
  await expect(page.getByTestId("tutor-reply")).toContainText("Shartda nima berilgan?");
  await page.screenshot({ path: "e2e/.results/miniapp-tutor-photo.png", fullPage: true });
});
