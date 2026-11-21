import { PrismaClient } from "@samarqand/db";
import { expect, test } from "@playwright/test";
import { createStudent } from "./api";
import { E2E_PREFIX, openAsTelegram } from "./telegram";

const day = (ago: number) => new Date(new Date(Date.now() - ago * 24 * 3600_000).toISOString().slice(0, 10));

test("T-065: profilda guruh, davomat, ota-ona holati va natijalar tarixi", async ({ page, request }) => {
  const s = await createStudent(request, { fullName: "Profil Egasi", phone: "998901112291" });
  const prisma = new PrismaClient();
  try {
    const g = await prisma.group.create({
      data: { name: `${E2E_PREFIX}Profil guruhi`, schedule: "Du, Chor, Ju 15:00" },
    });
    const u = await prisma.user.update({
      where: { telegramId: BigInt(s.tg) },
      data: { student: { update: { groupId: g.id } } },
      select: { id: true },
    });
    await prisma.attendance.createMany({
      data: [7, 5, 2].map((ago, i) => ({
        groupId: g.id,
        userId: u.id,
        date: day(ago),
        status: (["PRESENT", "LATE", "ABSENT"] as const)[i] ?? "PRESENT",
      })),
    });
  } finally {
    await prisma.$disconnect();
  }
  await openAsTelegram(page, { id: s.tg, first_name: "Profil" }, "/profile");
  const school = page.getByTestId("school");
  await expect(school).toContainText("Profil guruhi");
  await expect(school).toContainText("Du, Chor, Ju 15:00");
  await expect(school).toContainText("Oxirgi 30 kun:keldi 1kechikdi 1kelmadi 1");
  await expect(school).toContainText("Ota-ona ulanmagan");
  await expect(page.getByRole("link", { name: /Mock va offline imtihonlar/ })).toBeVisible();
  await page.screenshot({ path: "e2e/.results/miniapp-profile-school.png", fullPage: true });
  await page.getByRole("link", { name: /Haftalik testlar/ }).click();
  await expect(page).toHaveURL(/\/weekly$/);
});
