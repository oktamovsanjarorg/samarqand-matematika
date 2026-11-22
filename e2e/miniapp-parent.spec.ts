import { PrismaClient } from "@samarqand/db";
import { expect, test } from "@playwright/test";
import { createStudent, grantFree, requestParentLink } from "./api";
import { E2E_PREFIX, openAsTelegram } from "./telegram";
import { seedWeekly } from "./weekly-seed";

const day = (ago: number) => new Date(new Date(Date.now() - ago * 24 * 3600_000).toISOString().slice(0, 10));

test("T-069, T-070, T-073, BR-PA01: ota-ona Asosiy sahifada farzandining davomati va natijalarini ko'radi", async ({
  page,
  request,
}) => {
  const s = await createStudent(request, { fullName: "Farzand Sinov", phone: "998901112301" });
  const second = await createStudent(request, { fullName: "Kichik Farzand", phone: "998901112302" });
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
    // Ikkinchi farzand: shu ota-ona, ustoz hali tasdiqlamagan (T-070)
    const p = await prisma.user.findUniqueOrThrow({
      where: { telegramId: BigInt(parent.id) },
      select: { id: true },
    });
    const k = await prisma.studentProfile.findFirstOrThrow({
      where: { user: { telegramId: BigInt(second.tg) } },
      select: { id: true },
    });
    await prisma.parentLink.create({ data: { parentId: p.id, studentId: k.id, phone: "998935550301" } });
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
  // T-070: kirish holati aniq sabab bilan, kutilayotgan farzand, Darslar tabi yo'q
  await expect(child.getByTestId("child-access")).toContainText(
    "Pullik darslar yopiq: ustoz qabul qilmagan, obuna toʻlanmagan",
  );
  // T-121: ota-ona obunani o'zi to'laydi
  await expect(
    child.getByTestId("child-access").getByRole("link", { name: "Obunani toʻlash" }),
  ).toBeVisible();
  await expect(page.getByTestId("child-pending").filter({ hasText: "Kichik Farzand" })).toContainText(
    "ustoz tasdigʻini kutmoqda",
  );
  await expect(page.getByRole("link", { name: "Darslar" })).toHaveCount(0);
  // O'quvchiga mo'ljallangan bloklar ota-onaga chiqmaydi
  await expect(page.getByTestId("access")).toHaveCount(0);
  await page.screenshot({ path: "e2e/.results/miniapp-parent.png", fullPage: true });

  // T-073: Profil: farzandlar holati, bot xabarlari, yana farzand ulash yo'li
  await page.getByRole("link", { name: "Profil" }).click();
  const kids = page.getByTestId("parent-child");
  await expect(kids.filter({ hasText: "Farzand Sinov" })).toContainText("Tasdiqlangan");
  await expect(kids.filter({ hasText: "Kichik Farzand" })).toContainText("Kutilmoqda");
  await expect(page.getByTestId("parent-notices")).toContainText("darsga kelmasa yoki kechiksa");
  await expect(page.getByTestId("parent-add")).toContainText("/ota");
  await expect(page.getByTestId("tiles")).toHaveCount(0);
  await page.screenshot({ path: "e2e/.results/miniapp-parent-profile.png", fullPage: true });
});

test("T-138: ota-ona farzandining hozir ochiq haftalik testini va topshirmaganini ko'radi (ballsiz)", async ({
  page,
  request,
}) => {
  const w = await seedWeekly(request);
  try {
    const name = "Ochiq Farzand";
    const s = await createStudent(request, { fullName: name, phone: "998901112305" });
    await grantFree(request, w.admin, name);
    const parent = await requestParentLink(request, s.tg, "998935550305");
    const prisma = new PrismaClient();
    try {
      const k = await prisma.studentProfile.findFirstOrThrow({
        where: { user: { telegramId: BigInt(s.tg) } },
        select: { id: true },
      });
      await prisma.parentLink.updateMany({ where: { studentId: k.id }, data: { status: "APPROVED" } });
    } finally {
      await prisma.$disconnect();
    }
    await openAsTelegram(page, { id: parent.id, first_name: "Ona" }, "/");
    const child = page.getByTestId("child").filter({ hasText: name });
    const row = child.getByTestId("child-open-test").filter({ hasText: "Navbat haftasi" });
    await expect(row).toContainText("Haftalik:");
    await expect(row).toContainText("Hali boshlamagan");
    await expect(row).toContainText(/gacha$/);
    await row.scrollIntoViewIfNeeded();
    await page.screenshot({ path: "e2e/.results/miniapp-parent-open-tests.png", fullPage: true });
  } finally {
    await w.close();
  }
});
