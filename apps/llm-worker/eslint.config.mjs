import baseConfig from "../../packages/config/eslint.config.mjs";

export default [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        Cloudflare: "readonly",
        ExecutionContext: "readonly",
        RequestInit: "readonly",
      },
    },
    ignorePatterns: ["worker-configuration.d.ts"],
  },
];
