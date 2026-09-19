import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

/**
 * Flat ESLint config.
 *   npm run lint        check
 *   npm run lint:fix    autofix
 *
 * `legacy/` is intentionally ignored — it's the archived vanilla build.
 */
export default [
  { ignores: ["dist/**", "node_modules/**", "legacy/**", "coverage/**", "public/**"] },

  js.configs.recommended,

  {
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2024,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: { react: { version: "detect" } },
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,

      "react/prop-types": "off", // plain JS project, no prop-types in use
      "react/no-unknown-property": "off", // Tailwind/CSS custom props
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^[A-Z_]+$", caughtErrors: "none" },
      ],
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      eqeqeq: ["warn", "smart"],
      "prefer-const": "warn",
      "no-var": "error",
      "object-shorthand": "warn",
    },
  },

  // Test + script files get a looser rule set.
  {
    files: ["src/**/*.test.{js,jsx}", "src/test/**", "scripts/**"],
    languageOptions: { globals: { ...globals.node, ...globals.vitest } },
    rules: {
      "no-console": "off",
    },
  },
];
