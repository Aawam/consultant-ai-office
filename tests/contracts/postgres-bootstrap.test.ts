import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();

describe("PostgreSQL bootstrap", () => {
  it("pins one local PostgreSQL service and health check", async () => {
    const compose = await readFile(
      path.join(repositoryRoot, "compose.yaml"),
      "utf8",
    );

    expect(compose).toContain("image: postgres:17-alpine");
    expect(compose).toContain("pg_isready");
    expect(compose).not.toContain("redis");
  });

  it("commits a non-business bootstrap migration", async () => {
    const migration = await readFile(
      path.join(
        repositoryRoot,
        "packages/infrastructure/migrations/0000_bootstrap.sql",
      ),
      "utf8",
    );

    expect(migration).toContain("SELECT 1;");
    expect(migration).not.toMatch(/CREATE\s+TABLE/i);
  });
});
