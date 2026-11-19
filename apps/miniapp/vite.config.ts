import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
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
