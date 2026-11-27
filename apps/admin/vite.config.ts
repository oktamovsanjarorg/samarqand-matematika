import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

/** Router "/admin" ga o'tadi, Vite esa faqat "/admin/" ni taniydi: qayta yuklashda 404 bo'lmasligi uchun */
const adminSlash = (): Plugin => ({
  name: "admin-trailing-slash",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url !== "/admin" && !req.url?.startsWith("/admin?")) return next();
      res.statusCode = 302;
      res.setHeader("Location", req.url.replace("/admin", "/admin/"));
      res.end();
    });
  },
});

/** Kamdan-kam o'zgaradigan va har sahifada kerak kutubxonalar (pnpm yo'li: node_modules/.pnpm/x/node_modules/x) */
const VENDOR = /node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|@tanstack\/[^/]+)\//;

export default defineConfig({
  base: "/admin/",
  plugins: [react(), adminSlash()],
  build: {
    rollupOptions: {
      output: {
        // T-189: kutubxonalar alohida faylda: deploy'da faqat ilova kodi o'zgaradi, vendor brauzer keshida qoladi
        manualChunks: (id) => (VENDOR.test(id) ? "vendor" : undefined),
      },
    },
  },
  resolve: {
    alias: {
      "@samarqand/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url)),
      "@samarqand/math": fileURLToPath(new URL("../../packages/math/src/index.ts", import.meta.url)),
    },
  },
  server: {
    port: 5191,
    host: "127.0.0.1",
    proxy: { "/api": "http://127.0.0.1:4300" },
  },
});
