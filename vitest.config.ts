import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@consultant-ai-office/ai-agent": fileURLToPath(
        new URL("./packages/ai-agent/src/index.ts", import.meta.url),
      ),
      "@consultant-ai-office/application": fileURLToPath(
        new URL("./packages/application/src/index.ts", import.meta.url),
      ),
      "@consultant-ai-office/domain": fileURLToPath(
        new URL("./packages/domain/src/index.ts", import.meta.url),
      ),
      "@consultant-ai-office/infrastructure": fileURLToPath(
        new URL("./packages/infrastructure/src/index.ts", import.meta.url),
      ),
      "@consultant-ai-office/rab-calculation-engine": fileURLToPath(
        new URL(
          "./packages/rab-calculation-engine/src/index.ts",
          import.meta.url,
        ),
      ),
      "@consultant-ai-office/shared-contracts": fileURLToPath(
        new URL("./packages/shared-contracts/src/index.ts", import.meta.url),
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
