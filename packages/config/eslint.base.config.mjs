import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  js.configs.recommended,
  tseslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectServices: true,
        ecmaFeatures: {
          jsx: true,
        },
      },
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2024,
        ...globals.browser,
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    rules: {
      // ESLint recommended rules are already included via js.configs.recommended
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          ignoreRestSiblings: true,
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-unused-vars": "off", // Disable base rule as it can report incorrect errors
      "no-redeclare": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react/jsx-uses-react": "off",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", disallowTypeAnnotations: false },
      ],
      "@typescript-eslint/ban-ts-comment": "warn",
      "no-array-constructor": "off",
      "@typescript-eslint/no-array-constructor": "warn",
      "@typescript-eslint/no-duplicate-enum-values": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-extra-non-null-assertion": "warn",
      "@typescript-eslint/no-for-in-array": "warn",
      "no-implied-eval": "off",
      "@typescript-eslint/no-misused-new": "warn",
      "@typescript-eslint/no-namespace": "warn",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-this-alias": "warn",
      "@typescript-eslint/no-unnecessary-type-constraint": "warn",
      "no-unused-expressions": "off",
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/no-wrapper-object-types": "warn",
      "no-throw-literal": "off",
      "@typescript-eslint/prefer-as-const": "warn",
      "@typescript-eslint/prefer-namespace-keyword": "warn",
      "prefer-promise-reject-errors": "off",
      "require-await": "off",
      "@typescript-eslint/triple-slash-reference": "warn",
      "@typescript-eslint/no-deprecated": "warn",

      // Promises
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/await-thenable": "off",
      "@typescript-eslint/no-misused-promises": [
        "warn",
        { checksVoidReturn: false },
      ],

      // Console
      "no-console": ["warn", { allow: ["warn", "error", "info", "debug"] }],

      // General
      "prefer-const": ["warn", { destructuring: "all" }],
      "no-empty": "warn",
      "object-shorthand": "warn",
    },
    settings: {
      react: {
        version: "19",
      },
    },
  },
  prettier,
  {
    ignores: [
      "node_modules/",
      "dist/",
      "build/",
      ".next/",
      ".expo/",
      ".turbo/",
      "*.min.js",
      "coverage/",
      "next-env.d.ts",
    ],
  },
]);
