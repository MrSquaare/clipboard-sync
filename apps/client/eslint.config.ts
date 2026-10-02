import config from "@clipboard-sync/eslint-config";
import reactHooks from "eslint-plugin-react-hooks";
// eslint-disable-next-line import-x/no-named-as-default
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default [
  { ignores: ["node_modules/", "dist/", "src-tauri/", "**/*.d.ts"] },
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
];
