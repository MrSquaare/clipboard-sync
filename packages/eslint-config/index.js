import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import * as importPluginX from "eslint-plugin-import-x";
import * as ts from "typescript-eslint";

export default defineConfig(
  js.configs.recommended,
  ...ts.configs.recommended,
  importPluginX.flatConfigs.recommended,
  importPluginX.flatConfigs.typescript,
  {
    settings: {
      "import-x/resolver": {
        node: true,
        typescript: true,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "import-x/no-unresolved": "off",
      "import-x/order": [
        "error",
        {
          alphabetize: { order: "asc", caseInsensitive: true },
          "newlines-between": "always",
        },
      ],
    },
  },
);
