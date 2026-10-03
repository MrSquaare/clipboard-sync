import config from "@clipboard-sync/shared-config/eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([globalIgnores(["apps/", "packages/"]), ...config]);
