import { PrismaClient } from "@samarqand/db";
import { expect, test } from "@playwright/test";
import { createStudent, requestParentLink } from "./api";
import { E2E_PREFIX, openAsTelegram } from "./telegram";

const day = (ago: number) => new Date(new Date(Date.now() - ago * 24 * 3600_000).toISOString().slice(0, 10));

test("T-069, BR-PA01: ota-ona Asosiy sahifada farzandining davomati va natijalarini ko'radi", async ({
  page,
  request,
}) => {
  const s = await createStudent(request, { fullName: "Farzand Sinov", phone: "998901112301" });
  const parent = await requestParentLink(request, s.tg, "998935550301");
  const prisma = new PrismaClient();
  try {
    const g = await prisma.group.create({ data: { name: `${E2E_PREFIX}Ota guruhi` } });
    const u = await prisma.user.update({
      where: { telegramId: BigInt(s.tg) },
      data: { student: { update: { groupId: g.id } } },
      select: { id: true, student: { select: { id: true } } },
    });
    await prisma.parentLink.updateMany({ where: { studentId: u.student?.id }, data: { status: "APPROVED" } });
    await prisma.attendance.createMany({
      data: [
        { groupId: g.id, userId: u.id, date: day(3), status: "PRESENT" },
        { groupId: g.id, userId: u.id, date: day(1), status: "ABSENT" },
      ],
    });
  } finally {
    await prisma.$disconnect();
  }

  await openAsTelegram(page, { id: parent.id, first_name: "Ota" }, "/");
  const child = page.getByTestId("child").filter({ hasText: "Farzand Sinov" });
  await expect(child).toContainText("Ota guruhi");
  await expect(child).toContainText("Oxirgi 30 kun: keldi 1, kechikdi 0, kelmadi 1");
  await expect(child).toContainText("Mavzu testlari: 0 ta");
  // O'quvchiga mo'ljallangan bloklar ota-onaga chiqmaydi
  await expect(page.getByTestId("access")).toHaveCount(0);
  await page.screenshot({ path: "e2e/.results/miniapp-parent.png", fullPage: true });
});
