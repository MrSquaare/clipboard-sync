import config from "@clipboard-sync/shared-config/eslint";
import reactHooks from "eslint-plugin-react-hooks";
// eslint-disable-next-line import-x/no-named-as-default
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";

export default defineConfig([
  globalIgnores(["dist/", "src-tauri/", "**/*.d.ts"]),
  ...config,
  reactHooks.configs.flat["recommended-latest"],
  reactRefresh.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
]);
