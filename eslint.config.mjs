import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const webFiles = ["apps/office-web/**/*.{ts,tsx}"];

export default defineConfig([
  ...nextTypescript,
  ...nextVitals.map((configuration) => ({
    ...configuration,
    files: webFiles,
    settings: {
      ...configuration.settings,
      next: { rootDir: "apps/office-web" },
      react: { version: "19.2" },
    },
  })),
  {
    files: webFiles,
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  globalIgnores([
    "**/.next/**",
    "**/dist/**",
    "**/node_modules/**",
    "**/coverage/**",
    "packages/infrastructure/migrations/**",
    "references/raw/**",
  ]),
]);
