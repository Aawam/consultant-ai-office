import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();

describe("repository governance", () => {
  it("locks the mandatory architecture and scope guardrails", async () => {
    const agents = await readFile(path.join(repositoryRoot, "AGENTS.md"), "utf8");

    for (const requiredRule of [
      "DRAFT → REVIEW → FINAL",
      "A-001",
      "A-011",
      "AI is not source of truth",
      "Critical calculation is deterministic",
      "no direct database, SQL, filesystem, or terminal access",
      "same Application Use Cases",
      "Golden Reference and Contract-Derived Acceptance Tests",
      "Never create synthetic data and label it Golden Reference",
      "PDF implementation and testing are deferred",
      "Do not build Phase 2–5",
      "DECISION REQUIRED — MANAGER",
      "actual command output",
    ]) {
      expect(agents).toContain(requiredRule);
    }
  });

  it(
    "tracks the exact SHA-256 of every active reference binary",
    async () => {
      const manifest = await readFile(
        path.join(repositoryRoot, "references/MANIFEST.md"),
        "utf8",
      );
      const expected = new Map([
      [
        "Contoh Rekap RAB dan BV.xlsx",
        "d6a3178d862e92d88ddb62e5b3b904cbf3038b183042c76d7da51095a752cb36",
      ],
      [
        "EE Kantor Lurah Sambaliung 2024 (Tender) Alternatif 2 (version 1).xlsx",
        "41cf4028bf336c3f6959b78fd9490132786f09bae4bfb5ec74ee4e40c59179f4",
      ],
      [
        "Lampiran VI Surat Edaran Direktur Jenderal Bina Konstruksi Nomor 47-SE-Dk-2026 AHSP Bidang Cipta Karya.pdf",
        "64dfd7d14751dcd5032c9f2c35c4971fa121afcbbf49180abf7a4bf66c3e9202",
      ],
      [
        "Masterfile AHSP CK.xlsx",
        "e51e49612dca67b5796392403be707b8e62d54505a1a6447c1c91f16fbd72f92",
      ],
      ]);

      for (const [fileName, expectedHash] of expected) {
        const contents = await readFile(
          path.join(repositoryRoot, "references/raw", fileName),
        );
        const actualHash = createHash("sha256").update(contents).digest("hex");

        expect(actualHash).toBe(expectedHash);
        expect(manifest).toContain(expectedHash);
      }
    },
    60_000,
  );
});
