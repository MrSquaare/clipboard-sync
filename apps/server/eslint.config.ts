import config from "@clipboard-sync/eslint-config";

export default [
  { ignores: ["node_modules/", "dist/", ".wrangler/"] },
  ...config,
];
