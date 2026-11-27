import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

/** Kamdan-kam o'zgaradigan va har sahifada kerak kutubxonalar (pnpm yo'li: node_modules/.pnpm/x/node_modules/x) */
const VENDOR = /node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|@tanstack\/[^/]+)\//;

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // T-189: kutubxonalar alohida faylda: deploy'da faqat ilova kodi o'zgaradi, vendor brauzer keshida qoladi
        manualChunks: (id) => (VENDOR.test(id) ? "vendor" : undefined),
      },
    },
  },
  resolve: {
    // shared paketi TS manbasidan olinadi (CJS build'siz)
    alias: {
      "@samarqand/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url)),
      "@samarqand/math": fileURLToPath(new URL("../../packages/math/src/index.ts", import.meta.url)),
    },
  },
  server: {
    port: 5190,
    host: "127.0.0.1",
    // cloudflared tunnel orqali ochilganda host tekshiruvi to'smasligi uchun
    allowedHosts: true,
    proxy: { "/api": "http://127.0.0.1:4300" },
  },
});
