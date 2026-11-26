import { expect, test } from "@playwright/test";
import { adminHeaders, apiPost, createStudent, grantFree } from "./api";
import { E2E_PREFIX, openAsTelegram } from "./telegram";

/** Ismda raqam bo'lmaydi: vaqt belgisini harflarga aylantiramiz */
const tag = () => [...String(Date.now()).slice(-6)].map((d) => "abcdefghij"[Number(d)]).join("");

test("T-181: o'quvchi o'z offline natijasini ball va o'rni bilan ko'radi", async ({ page, request }) => {
  const t = tag();
  const name = `Offline Oquvchi${t}`;
  const phone = `99895${String(Date.now()).slice(-7)}`;
  const s = await createStudent(request, { fullName: name, phone });
  const admin = await adminHeaders(request);
  await grantFree(request, admin, name);
  const csv = ["Ism;Telefon;Q1;Q2;Q3", `Boshqa Bola${t};;1;1;1`, `${name};${phone};1;0;`].join("\n");
  await apiPost(request, "/admin/offline-tests", admin, {
    title: `${E2E_PREFIX}Oktabr ${t}`,
    date: "2026-10-30",
    csv,
    sections: [],
  });

  await openAsTelegram(page, { id: s.tg, first_name: "Oquvchi" }, "/mocks");
  const card = page.getByTestId("offline-result").filter({ hasText: `Oktabr ${t}` });
  await expect(card).toContainText("30.10.2026 · 1/3 toʻgʻri · 2-oʻrin, 2 kishidan");
  await expect(card).toContainText("75 dan");
  await page.screenshot({ path: "e2e/.results/miniapp-offline.png", fullPage: true });
});
