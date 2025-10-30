declare module "@vibezone/config/eslint" {
  import type { defineConfig } from "eslint/config";

  const config: ReturnType<typeof defineConfig>;
  export default config;
}
