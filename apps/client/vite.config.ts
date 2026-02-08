import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const host = process.env.TAURI_DEV_HOST;
const env = process.env.ENV;

export default defineConfig(async () => ({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  define: {
    __DEFAULT_SERVER_URL__: JSON.stringify(
      process.env.DEFAULT_SERVER_URL
        ? process.env.DEFAULT_SERVER_URL
        : env === "production"
          ? "wss://clipboard-sync.mrsquaare.fr"
          : env === "preview"
            ? "wss://clipboard-sync-preview.mrsquaare.fr"
            : env === "dev"
              ? "wss://clipboard-sync-dev.mrsquaare.fr"
              : "ws://localhost:8787",
    ),
    __LOG_LEVEL__: JSON.stringify(
      process.env.LOG_LEVEL
        ? process.env.LOG_LEVEL
        : env === "production"
          ? "error"
          : env === "preview"
            ? "info"
            : env === "dev"
              ? "debug"
              : "debug",
    ),
  },
}));
