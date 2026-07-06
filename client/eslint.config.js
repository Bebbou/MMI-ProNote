import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  { ignores: ["dist", "dev-dist", "node_modules"] },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.serviceworker },
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Les composants React sont utilisés en JSX, ESLint ne le voit pas seul
      "no-unused-vars": ["warn", { varsIgnorePattern: "^[A-Z_]" }],
      "react-refresh/only-export-components": "off",
      // Trop strict pour le pattern "fetch au montage" (setLoading dans l'effet)
      "react-hooks/set-state-in-effect": "off",
    },
  },
];
