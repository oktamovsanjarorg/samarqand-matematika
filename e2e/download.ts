import { readFile } from "node:fs/promises";
import type { Locator, Page } from "@playwright/test";

/** Tugma bosilganda yuklangan faylning nomi va matni (T-076) */
export async function downloadText(page: Page, button: Locator) {
  const [dl] = await Promise.all([page.waitForEvent("download"), button.click()]);
  return { name: dl.suggestedFilename(), text: await readFile(await dl.path(), "utf8") };
}
