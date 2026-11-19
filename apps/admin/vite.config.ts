import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/admin/",
  plugins: [react()],
  resolve: {
    alias: {
      "@samarqand/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url)),
    },
  },
  server: {
    port: 5191,
    host: "127.0.0.1",
    proxy: { "/api": "http://127.0.0.1:4300" },
  },
});
