import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";

/** Paketlar orasidagi chegara: `files` ichidagi kod `patterns` ni import qilmaydi (docs/03-architecture.md). */
const forbid = (files, patterns, message) => ({
  files,
  ignores: ["**/*.test.ts", "**/*.test.tsx"],
  rules: { "no-restricted-imports": ["error", { patterns: [{ group: patterns, message }] }] },
});

const PARAMS_RULE = {
  selector:
    ':matches(FunctionDeclaration, ArrowFunctionExpression, MethodDefinition[kind!="constructor"] > FunctionExpression)[params.length>4]',
  message: "4 tadan ko'p parametr: obyekt parametrga o'tkazing.",
};

const APPS = ["@samarqand/api", "@samarqand/bot", "@samarqand/miniapp", "@samarqand/admin"];
const DB = ["@samarqand/db", "@prisma/client", "@samarqand/db/*"];

export default [
  js.configs.recommended,
  {
    ignores: ["**/dist/**", "**/.turbo/**", "**/node_modules/**", "**/coverage/**", "**/*.d.ts"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      ...tsPlugin.configs["strict"].rules,
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": ["error", { disallowTypeAnnotations: false }],
      "@typescript-eslint/no-extraneous-class": ["error", { allowWithDecorator: true }],
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      // TypeScript o'zi tekshiradi
      "no-undef": "off",
      "no-redeclare": "off",
      // Hajm chegaralari: katta fayl yoki funksiya bo'lish kerakligining belgisi (docs/12-ai-playbook.md §4)
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["error", { max: 60, skipBlankLines: true, skipComments: true }],
      complexity: ["error", 12],
      "max-depth": ["error", 3],
      "no-restricted-syntax": ["error", PARAMS_RULE],
    },
  },
  {
    // NestJS DI uchun API'da qiymat sifatida import kerak (decorator metadata): type-only import majburlanmaydi
    files: ["apps/api/**/*.ts"],
    rules: { "@typescript-eslint/consistent-type-imports": "off" },
  },
  {
    files: ["apps/miniapp/**/*.tsx", "apps/admin/**/*.tsx", "packages/ui/**/*.tsx"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      // Hex ranglar faqat packages/ui-tokens'da (docs/PLAN.md §8.1)
      "no-restricted-syntax": [
        "error",
        PARAMS_RULE,
        {
          selector: "Literal[value=/#[0-9a-fA-F]{3,8}\\b/]",
          message: "Rang faqat tokenlar orqali (ui-tokens).",
        },
      ],
    },
  },
  forbid(["packages/**/*.ts", "packages/**/*.tsx"], APPS, "Paketlar ilovalarni import qilmaydi."),
  forbid(
    ["apps/bot/**/*.ts", "apps/miniapp/**/*.{ts,tsx}", "apps/admin/**/*.{ts,tsx}"],
    DB,
    "Bot va UI bazaga to'g'ridan-to'g'ri murojaat qilmaydi: faqat API orqali.",
  ),
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/test/**/*.ts"],
    rules: {
      "max-lines-per-function": "off",
      "max-lines": ["error", 500],
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
];
