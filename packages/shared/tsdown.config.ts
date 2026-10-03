import { defineConfig } from "tsdown";

export default defineConfig({
  dts: true,
  entry: [
    "src/hono/middleware/logger.ts",
    "src/schemas/client.ts",
    "src/schemas/server.ts",
    "src/schemas/update-server.ts",
    "src/utils/logger.ts",
  ],
  exports: true,
});
