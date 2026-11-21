import { expect, test } from "@playwright/test";
import { adminHeaders, apiPost, createStudent, grantFree } from "./api";
import { E2E_PREFIX, openAsTelegram } from "./telegram";

/** Ismda raqam bo'lmaydi: vaqt belgisini harflarga aylantiramiz */
const tag = () => [...String(Date.now()).slice(-6)].map((d) => "abcdefghij"[Number(d)]).join("");

test("T-056c: o'quvchi o'z offline natijasini bo'limlar va o'rni bilan ko'radi", async ({
  page,
  request,
}) => {
  const t = tag();
  const name = `Offline Oquvchi${t}`;
  const phone = `99895${String(Date.now()).slice(-7)}`;
  const s = await createStudent(request, { fullName: name, phone });
  const admin = await adminHeaders(request);
  await grantFree(request, admin, name);
  const csv = ["Ism;Telefon;Algebra;Geometriya", `Boshqa Bola${t};;14;10`, `${name};${phone};12,5;8`].join(
    "\n",
  );
  await apiPost(request, "/admin/offline-tests", admin, {
    title: `${E2E_PREFIX}Oktabr ${t}`,
    date: "2026-10-30",
    csv,
  });

  await openAsTelegram(page, { id: s.tg, first_name: "Oquvchi" }, "/mocks");
  const card = page.getByTestId("offline-result").filter({ hasText: `Oktabr ${t}` });
  await expect(card).toContainText("30.10.2026 · 2-oʻrin, 2 kishidan");
  await expect(card).toContainText("20,5");
  await expect(card).toContainText("Algebra12,5");
  await page.screenshot({ path: "e2e/.results/miniapp-offline.png", fullPage: true });
});
