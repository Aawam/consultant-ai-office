import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@consultant-ai-office/ai-agent": fileURLToPath(
        new URL("./packages/ai-agent/src/index.ts", import.meta.url),
      ),
      "@consultant-ai-office/rab-calculation-engine": fileURLToPath(
        new URL(
          "./packages/rab-calculation-engine/src/index.ts",
          import.meta.url,
        ),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "packages/**/*.test.ts"],
    passWithNoTests: false,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
