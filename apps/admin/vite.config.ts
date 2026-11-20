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

export default defineConfig({
  base: "/admin/",
  plugins: [react(), adminSlash()],
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
