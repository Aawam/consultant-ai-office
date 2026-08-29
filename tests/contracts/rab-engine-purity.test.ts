import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const engineRoot = path.resolve("packages/rab-calculation-engine");
const sourceRoot = path.join(engineRoot, "src");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const entryPath = path.join(directory, entry);
    return statSync(entryPath).isDirectory() ? sourceFiles(entryPath) : [entryPath];
  });
}

describe("rab-calculation-engine purity guard", () => {
  it("declares no forbidden runtime dependency", () => {
    const manifest = JSON.parse(
      readFileSync(path.join(engineRoot, "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };
    expect(Object.keys(manifest.dependencies ?? {}).sort()).toEqual([
      "@consultant-ai-office/domain",
      "@consultant-ai-office/shared-contracts",
      "decimal.js",
    ]);
  });

  it("imports no web, database, filesystem, Excel, AI, or network module", () => {
    const source = sourceFiles(sourceRoot)
      .filter((file) => file.endsWith(".ts"))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    const forbiddenImport =
      /from\s+["'](?:node:|next(?:\/|["'])|react(?:\/|["'])|drizzle-orm|pg(?:\/|["'])|postgres(?:\/|["'])|exceljs|openai)/;

    expect(source).not.toMatch(forbiddenImport);
  });
});
