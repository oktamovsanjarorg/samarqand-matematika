import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

// Lokal: .env (BOT_TOKEN, DATABASE_URL). CI: env workflow'da beriladi
if (existsSync(".env")) process.loadEnvFile(".env");

/** Brauzer testlari uchun ustoz username'i: API shu nom bilan kirganni TEACHER qiladi */
export const E2E_OWNER = "e2e_browser_owner";

const CI = !!process.env.CI;
const apiEnv = { OWNER_USERNAMES: E2E_OWNER, ADMIN_URL: "http://127.0.0.1:5191/admin" };

export default defineConfig({
  testDir: "e2e",
  globalTeardown: "./e2e/teardown.ts",
  outputDir: "e2e/.results",
  fullyParallel: false,
  workers: 1,
  retries: CI ? 1 : 0,
  reporter: CI ? [["list"], ["html", { open: "never", outputFolder: "e2e/.report" }]] : "list",
  use: {
    ...devices["Pixel 7"],
    // Telegram Mini App telefon ekranida ochiladi
    locale: "uz-UZ",
    timezoneId: "Asia/Tashkent",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Lokal: tizimdagi boshqa Chromium bilan ishlatish mumkin (CHROMIUM_PATH=...)
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [{ name: "chromium" }],
  webServer: [
    {
      command: "pnpm --filter @samarqand/api dev",
      url: "http://127.0.0.1:4300/api/health",
      env: apiEnv,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "pnpm --filter @samarqand/miniapp dev",
      url: "http://127.0.0.1:5190",
      // .env.local dagi dev kirish (VITE_DEV_INIT_DATA) testga aralashmasin: kirish faqat Telegram stub orqali
      env: { VITE_DEV_INIT_DATA: "" },
      reuseExistingServer: false,
    },
    {
      command: "pnpm --filter @samarqand/admin dev",
      url: "http://127.0.0.1:5191/admin/",
      reuseExistingServer: !CI,
    },
  ],
});
