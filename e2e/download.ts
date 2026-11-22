import { readFile } from "node:fs/promises";
import type { Locator, Page } from "@playwright/test";
import { toCsv } from "@samarqand/shared";
import { readXlsx } from "../apps/admin/src/lib/xlsx";

/**
 * Tugma bosilganda yuklangan faylning nomi va matni (T-076). Excel (.xlsx, T-154) fayli haqiqiy
 * o'quvchi bilan ochiladi va avvalgi CSV ko'rinishida qaytadi, shuning uchun tekshiruvlar katak qiymatlariga qaraydi.
 */
export async function downloadText(page: Page, button: Locator) {
  const [dl] = await Promise.all([page.waitForEvent("download"), button.click()]);
  const name = dl.suggestedFilename();
  const data = await readFile(await dl.path());
  const text = name.endsWith(".xlsx") ? toCsv(readXlsx(new Uint8Array(data))) : data.toString("utf8");
  return { name, text, data };
}
