import { expect, test } from "@playwright/test";
import { PrismaClient } from "@samarqand/db";
import { createStudent, loginAdmin } from "./api";

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
