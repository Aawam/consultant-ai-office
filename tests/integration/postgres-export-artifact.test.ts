import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresArtifactStorage } from "@consultant-ai-office/infrastructure";
import type { ArtifactRecord } from "@consultant-ai-office/application";

const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) throw new Error("TEST_DATABASE_URL is required for artifact integration tests");

describe("PostgreSQL export artifact persistence", () => {
  const pool = new Pool({ connectionString });
  let root = "";
  const projectId = "80000000-0000-4000-8000-000000000001";
  const rabVersionId = "80000000-0000-4000-8000-000000000002";

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), "consultant-ai-office-artifacts-"));
    await pool.query("insert into office.projects (project_id, code, name, created_by, created_at) values ($1, $2, $3, $4, now()) on conflict (project_id) do nothing", [projectId, "EXP-ART", "Artifact Test", "test"]);
    await pool.query("insert into office.rab_versions (rab_version_id, project_id, revision_number, status, source_data, warning_confirmations, created_at, updated_at) values ($1, $2, '1', 'FINAL', '{}', '[]', now(), now()) on conflict (rab_version_id) do nothing", [rabVersionId, projectId]);
  });
  afterAll(async () => { await pool.query("delete from office.export_artifacts where project_id = $1", [projectId]); await pool.query("delete from office.rab_versions where rab_version_id = $1", [rabVersionId]); await pool.query("delete from office.projects where project_id = $1", [projectId]); await pool.end(); await rm(root, { recursive: true, force: true }); });

  it("persists repeated FINAL exports with the same snapshot without overwriting", async () => {
    const storage = new PostgresArtifactStorage(pool, root);
    const base: ArtifactRecord = { artifactId: "80000000-0000-4000-8000-000000000011", projectId, rabVersionId, snapshotId: "rab-2-snapshot", exportType: "OFFICIAL", status: "FINAL", generatedBy: "admin", generatedAt: new Date("2026-01-01T00:00:00.000Z"), filePath: "", sha256: "" };
    const first = await storage.save(base, new Uint8Array([1, 2, 3]));
    const second = await storage.save({ ...base, artifactId: "80000000-0000-4000-8000-000000000012" }, new Uint8Array([1, 2, 3]));
    const count = await pool.query<{ count: string }>("select count(*)::text as count from office.export_artifacts where project_id = $1 and snapshot_id = $2", [projectId, base.snapshotId]);
    expect(count.rows[0]?.count).toBe("2");
    expect(first.filePath).not.toBe(second.filePath);
    expect(first.sha256).toBe(second.sha256);
  });
});
