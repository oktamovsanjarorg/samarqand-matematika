import { expect, test, type Page } from "@playwright/test";
import type { AgentReply } from "@samarqand/shared";
import { loginAdmin } from "./api";
import { violations } from "./axe";

test("T-156: AI o'chiq bo'lsa agent sahifasi buni aytadi, xabar maydoni yo'q", async ({ page, request }) => {
  await loginAdmin(page, request, "ai");
  await expect(page.getByRole("heading", { name: "AI yordamchi" })).toBeVisible();
  await expect(page.getByText("AI oʻchiq")).toBeVisible();
  await expect(page.getByLabel("AI yordamchiga xabar")).toHaveCount(0);
  await page.screenshot({ path: "e2e/.results/admin-agent-off.png", fullPage: true });
});

/** Model javoblari (pullik API chaqirilmaydi): server javobini brauzerda almashtiramiz */
async function fakeAgent(page: Page) {
  const bodies: { path: string; body: Record<string, unknown> }[] = [];
  const ask: AgentReply = {
    transcript: [{ role: "user", content: "Algebra kursini och" }],
    items: [
      { kind: "user", text: "Algebra kursini och" },
      { kind: "assistant", text: "Kursni yarataman. Tasdiqlang." },
    ],
    pending: { token: "signed-token-1", title: "Kurs yaratish: Algebra", lines: ["Nashr qilinmaydi"] },
  };
  const done: AgentReply = {
    transcript: [],
    items: [
      ...ask.items,
      { kind: "action", title: "Kurs yaratish: Algebra", ok: true },
      { kind: "assistant", text: "Tayyor: **Algebra** kursi Kontent boʻlimida." },
    ],
    pending: null,
  };
  await page.route("**/api/admin/agent", (r) => r.fulfill({ json: { enabled: true } }));
  await page.route("**/api/admin/agent/*", async (r) => {
    const path = new URL(r.request().url()).pathname;
    bodies.push({ path, body: r.request().postDataJSON() as Record<string, unknown> });
    await new Promise((ok) => setTimeout(ok, 300));
    await r.fulfill({ json: path.endsWith("/chat") ? ask : done });
  });
  return bodies;
}

test("T-156: ustoz yozadi, agent amalni tasdiqqa chiqaradi, tasdiqlangach bajarilgani ko'rinadi", async ({
  page,
  request,
}) => {
  const bodies = await fakeAgent(page);
  await loginAdmin(page, request, "ai");
  const box = page.getByLabel("AI yordamchiga xabar");
  await box.fill("Algebra kursini och");
  await box.press("Enter");
  await expect(page.getByText("AI ishlayapti…")).toBeVisible();

  const confirm = page.getByRole("region", { name: "Tasdiq kutilmoqda" });
  await expect(confirm).toContainText("Kurs yaratish: Algebra");
  await expect(confirm).toContainText("Nashr qilinmaydi");
  // Tasdiq kutilayotganda yangi xabar yozib bo'lmaydi
  await expect(box).toBeDisabled();
  expect(await violations(page, "/ai")).toEqual([]);
  await page.screenshot({ path: "e2e/.results/admin-agent-confirm.png", fullPage: true });

  // T-177: suhbatlar bo'limiga o'tib qaytilsa, tasdiq kutayotgan amal yo'qolmaydi
  const tabs = page.getByRole("navigation", { name: "AI yordamchi" });
  await tabs.getByRole("link", { name: "Oʻquvchilar suhbatlari" }).click();
  await expect(page).toHaveURL(/\/admin\/ai\/chats$/);
  await tabs.getByRole("link", { name: "Buyruq va savol" }).click();
  await expect(confirm).toContainText("Kurs yaratish: Algebra");

  await confirm.getByRole("button", { name: "Tasdiqlash" }).click();
  await expect(page.getByTestId("agent-items")).toContainText("Kurs yaratish: Algebra");
  await expect(page.getByTestId("agent-items")).toContainText("Kontent boʻlimida");
  await expect(confirm).toHaveCount(0);
  await expect(box).toBeEnabled();
  expect(bodies.map((b) => b.path.split("/").at(-1))).toEqual(["chat", "confirm"]);
  expect(bodies[0]?.body).toEqual({ transcript: [], message: "Algebra kursini och" });
  expect(bodies[1]?.body).toMatchObject({ token: "signed-token-1", approve: true });
  await page.screenshot({ path: "e2e/.results/admin-agent-done.png", fullPage: true });

  await page.getByRole("button", { name: "Yangi suhbat" }).click();
  await expect(page.getByRole("button", { name: "Bugun nima ishlar kutyapti?" })).toBeVisible();
});
