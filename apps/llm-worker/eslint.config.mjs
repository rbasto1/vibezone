import baseConfig from "../../packages/config/eslint.config.mjs";

export default [
  ...baseConfig,
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
];
