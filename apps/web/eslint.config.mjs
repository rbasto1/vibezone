import nextPlugin from "@next/eslint-plugin-next";
import eslintConfig from "@vibezone/config/eslint";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig } from "eslint/config";

export default defineConfig([
  eslintConfig,
  {
    plugins: {
      "@next/next": nextPlugin,
      "react-refresh": reactRefresh,
    },
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json"],
      },
      globals: {
        // React
        React: "readonly",
        // Next.js App Router global types
        LayoutProps: "readonly",
        PageProps: "readonly",
      },
    },
    rules: {
      // Next.js core web vitals rules
      ...nextPlugin.configs["core-web-vitals"].rules,
      "@next/next/no-html-link-for-pages": "off",
      // Additional recommended rules
      ...nextPlugin.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        {
          allowConstantExport: true,
          allowExportNames: ["metadata", "generateMetadata"],
        },
      ],
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/await-thenable": "off",
      "@typescript-eslint/no-misused-promises": [
        "warn",
        { checksVoidReturn: false },
      ],
    },
  },
  {
    files: ["*.mjs"],
    languageOptions: {
      parser: "espree",
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: null,
      },
    },
  },
]);
