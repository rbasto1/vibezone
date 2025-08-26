import nextPlugin from "@next/eslint-plugin-next";
import baseConfig from "../../packages/config/eslint.config.mjs";

export default [
  ...baseConfig,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
    },
    languageOptions: {
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
          allowExportNames: ["metadata"],
        },
      ],
    },
  },
];
