import { PrismaClient } from "@samarqand/db";
import { expect, test } from "@playwright/test";
import { adminHeaders, apiPost, createStudent, loginAdmin } from "./api";
import { E2E_PREFIX } from "./telegram";

const API = "http://127.0.0.1:4300/api";

test("T-127: bosh sahifada obunasi tugayotganlar, bosilsa roʻyxatda 'Tugayotgan' filtri", async ({
  page,
  request,
}) => {
  const admin = await adminHeaders(request);
  const stamp = [...String(Date.now()).slice(-6)].map((d) => "abcdefghij"[Number(d)]).join("");
  const name = `Tugaydi Oquvchi${stamp}`;
  await createStudent(request, { fullName: name });
  const [s] = (await (
    await request.get(`${API}/admin/students?filter=all&q=${stamp}`, { headers: admin })
  ).json()) as {
    id: string;
  }[];
  await apiPost(request, `/admin/students/${s?.id}/accept`, admin, {});
  const plan = await apiPost<{ id: string }>(request, "/admin/plans", admin, {
    name: `${E2E_PREFIX}Tugash ${stamp}`,
    priceUzs: 100_000,
    durationDays: 30,
  });
  const prisma = new PrismaClient();
  try {
    const day = 86_400_000;
    await prisma.subscription.create({
      data: {
        userId: s?.id ?? "",
        planId: plan.id,
        startsAt: new Date(Date.now() - 28 * day),
        endsAt: new Date(Date.now() + 2 * day),
      },
    });
  } finally {
    await prisma.$disconnect();
  }

  await loginAdmin(page, request);
  await page.getByTestId("todo").filter({ hasText: "Obunasi tugayotganlar" }).click();
  await expect(page.getByRole("tab", { name: "Tugayotgan" })).toHaveAttribute("aria-selected", "true");
  await page.getByPlaceholder("Ism, username yoki telefon").fill(stamp);
  await expect(page.getByTestId("student").filter({ hasText: name })).toContainText("Obuna");
  await page.screenshot({ path: "e2e/.results/admin-expiring.png" });
});
