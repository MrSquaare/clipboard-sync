import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import * as importPluginX from "eslint-plugin-import-x";
import { configs as perfectionistConfigs } from "eslint-plugin-perfectionist";
import { defineConfig } from "eslint/config";
import * as ts from "typescript-eslint";

const VARIABLE_SELECTOR = {
  selector:
    ":is(VariableDeclaration, ExpressionStatement[expression.type='AssignmentExpression'])",
};
const CALL_SELECTOR = {
  selector:
    ":is(ExpressionStatement[expression.type='CallExpression'], ExpressionStatement[expression.type='AwaitExpression'])",
};
const CONTROL_FLOW_SELECTOR = {
  selector:
    ":is(BreakStatement, ContinueStatement, ReturnStatement, ThrowStatement)",
};

export default defineConfig(
  js.configs.recommended,
  ...ts.configs.recommended,
  importPluginX.flatConfigs.recommended,
  importPluginX.flatConfigs.typescript,
  {
    plugins: {
      "@stylistic": stylistic,
    },
    rules: {
      "@stylistic/padding-line-between-statements": [
        "error",
        { blankLine: "always", next: "*", prev: "import" },
        { blankLine: "always", next: "export", prev: "*" },
        { blankLine: "always", next: "*", prev: "export" },
        { blankLine: "always", next: "block-like", prev: "*" },
        { blankLine: "always", next: "*", prev: "block-like" },
        { blankLine: "always", next: CONTROL_FLOW_SELECTOR, prev: "*" },
        { blankLine: "always", next: CALL_SELECTOR, prev: VARIABLE_SELECTOR },
        { blankLine: "always", next: VARIABLE_SELECTOR, prev: CALL_SELECTOR },
        { blankLine: "any", next: "import", prev: "import" },
        { blankLine: "any", next: "export", prev: "export" },
        { blankLine: "any", next: VARIABLE_SELECTOR, prev: VARIABLE_SELECTOR },
        { blankLine: "any", next: CALL_SELECTOR, prev: CALL_SELECTOR },
      ],
    },
  },
  perfectionistConfigs["recommended-natural"],
  {
    rules: {
      "perfectionist/sort-imports": [
        "error",
        {
          customGroups: [
            {
              elementNamePattern: ".*\\.mock$",
              groupName: "mock",
            },
          ],
          groups: [
            "mock",
            "type-import",
            ["value-builtin", "value-external"],
            "type-internal",
            "value-internal",
            ["type-parent", "type-sibling", "type-index"],
            ["value-parent", "value-sibling", "value-index"],
            "ts-equals-import",
            "unknown",
          ],
          order: "asc",
          type: "natural",
        },
      ],
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "import-x/no-unresolved": "off",
    },
    settings: {
      "import-x/resolver": {
        node: true,
        typescript: true,
      },
    },
  },
);
