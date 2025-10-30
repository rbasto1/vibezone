import eslintConfig from "@vibezone/config/eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  eslintConfig,
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
      },
      globals: {
        Cloudflare: "readonly",
        ExecutionContext: "readonly",
        RequestInit: "readonly",
      },
    },
    rules: {
      "no-undef": "off",
    },
  },
  {
    ignores: ["worker-configuration.d.ts", ".wrangler"],
  },
]);
