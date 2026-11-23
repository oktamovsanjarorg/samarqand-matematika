import { defineConfig } from "vite";

/**
 * Landing (T-173): React faqat build paytida HTML'ga aylanadi (scripts/prerender.mjs), brauzerga
 * kichik skript (bot havolasi) va CSS boradi. Caddy uni asosiy domenda beradi.
 */
export default defineConfig({
  build: { ssrEmitAssets: false },
  preview: {
    port: 5192,
    host: "127.0.0.1",
    proxy: { "/api": "http://127.0.0.1:4300" },
  },
});
