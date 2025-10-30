import eslintConfig from "@vibezone/config/eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  eslintConfig,
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
  },
]);
