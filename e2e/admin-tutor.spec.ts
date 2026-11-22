import { expect, test } from "@playwright/test";
import { PrismaClient } from "@samarqand/db";
import { apiPost, createStudent, loginAdmin } from "./api";
import { notebookPng } from "./weekly-seed";

const API = "http://127.0.0.1:4300/api";

test("BR-T04: ustoz o'quvchining yordamchi bilan suhbatini ko'radi", async ({ page, request }) => {
  const s = await createStudent(request, { fullName: "Suhbat Oquvchi", phone: "998901112241" });
  // e2e muhitida AI o'chiq: suhbat bazaga to'g'ridan-to'g'ri yoziladi
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { telegramId: BigInt(s.tg) } });
    await prisma.tutorChat.create({
      data: {
        userId: user.id,
        mode: "FREE",
        messages: {
          create: [
            { role: "USER", text: "Kasrlarni qanday qoʻshamiz?", createdAt: new Date(Date.now() - 2000) },
            {
              role: "ASSISTANT",
              text: "Avval maxrajni tenglashtir: $\\frac{1}{2}=\\frac{2}{4}$",
              createdAt: new Date(Date.now() - 1000),
            },
          ],
        },
      },
    });
  } finally {
    await prisma.$disconnect();
  }

  await loginAdmin(page, request, "tutor");
  await page.getByRole("tab", { name: "Erkin savol" }).click();
  const row = page.getByTestId("tutor-chat-row").filter({ hasText: "Suhbat Oquvchi" });
  await expect(row).toContainText("1 ta savol");
  await row.click();
  const messages = page.getByTestId("tutor-messages");
  await expect(messages).toContainText("Kasrlarni qanday qoʻshamiz?");
  await expect(messages.locator(".katex").first()).toBeVisible();
  await page.screenshot({ path: "e2e/.results/admin-tutor.png", fullPage: true });
});

test("BR-T04, T-171: ustoz o'quvchi yuborgan rasmni suhbatda ko'radi", async ({ page, request, browser }) => {
  const s = await createStudent(request, { fullName: "Rasmli Oquvchi", phone: "998901112242" });
  const chat = await apiPost<{ id: string }>(request, "/tutor/chats", s.headers, { mode: "FREE" });
  const up = await request.post(`${API}/tutor/chats/${chat.id}/photos`, {
    headers: { ...s.headers, "content-type": "image/png" },
    data: await notebookPng(browser),
  });
  expect(up.status()).toBe(201);
  const { id: photoId } = (await up.json()) as { id: string };
  // e2e muhitida AI o'chiq: javob bazaga yoziladi, rasm xabarga bog'lanadi
  const prisma = new PrismaClient();
  try {
    const user = await prisma.tutorMessage.create({
      data: { chatId: chat.id, role: "USER", text: "", createdAt: new Date(Date.now() - 2000) },
    });
    await prisma.tutorPhoto.update({ where: { id: photoId }, data: { messageId: user.id } });
    await prisma.tutorMessage.create({
      data: {
        chatId: chat.id,
        role: "ASSISTANT",
        text: "Shartni oʻqidim",
        createdAt: new Date(Date.now() - 1000),
      },
    });
  } finally {
    await prisma.$disconnect();
  }
  await loginAdmin(page, request, `tutor/${chat.id}`);
  const photo = page.getByTestId("tutor-photo").locator("img");
  await expect(photo).toBeVisible();
  expect(await photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: "e2e/.results/admin-tutor-photo.png", fullPage: true });
});
