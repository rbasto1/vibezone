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
  },
  {
    ignores: ["worker-configuration.d.ts", ".wrangler"],
  },
];
