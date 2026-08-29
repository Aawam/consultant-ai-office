import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("PostgreSQL business migration", () => {
  it("coexists with the migration journal in the office schema", async () => {
    const migration = await readFile(
      path.join(
        process.cwd(),
        "packages/infrastructure/migrations/0001_regular_dexter_bennett.sql",
      ),
      "utf8",
    );

    expect(migration).toContain('CREATE SCHEMA IF NOT EXISTS "office";');
    expect(migration).not.toContain('CREATE SCHEMA "office";');
  });
});
