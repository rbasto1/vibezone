import nextPlugin from "@next/eslint-plugin-next";
import reactRefresh from "eslint-plugin-react-refresh";
import baseConfig from "../../packages/config/eslint.config.mjs";

export default [
  ...baseConfig,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
      "react-refresh": reactRefresh,
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
      ...baseConfig.rules,
      "react-refresh/only-export-components": [
        "warn",
        {
          allowConstantExport: true,
          allowExportNames: ["metadata", "generateMetadata"],
        },
      ],
    },
  },
];
