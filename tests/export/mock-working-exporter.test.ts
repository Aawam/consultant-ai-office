import { describe, expect, it } from "vitest";
import { MockWorkingRabWorkbookExporter } from "@consultant-ai-office/infrastructure";
import type { Project, RabVersion } from "@consultant-ai-office/domain";
import { phase1aWorkingOutputFixture } from "../fixtures/phase-1a-working-output.fixture";

const project: Project = { projectId: "project-1", code: "MOCK-01", name: "Mock", createdBy: "tester", createdAt: new Date("2026-08-31T00:00:00.000Z") };
const rab: RabVersion = { rabVersionId: "rab-1", projectId: project.projectId, revisionOfRabVersionId: null, revisionNumber: 1, title: "RAB", status: "REVIEW", ohProfitRate: "0.10", ppnRate: "0.11", items: [], validation: null, calculationSnapshot: null, confirmedWarningCodes: [], createdBy: "tester", createdAt: project.createdAt, updatedAt: project.createdAt };

describe("versioned mock working exporter", () => {
  it("returns the exact versioned fixture for a WORKING export and rejects OFFICIAL", async () => {
    const exporter = new MockWorkingRabWorkbookExporter(phase1aWorkingOutputFixture);
    const input = { project, rab, artifactId: "artifact-1", generatedAt: project.createdAt, snapshot: { snapshotId: "snapshot-1", bvLines: [], hspSnapshots: [], componentSnapshots: [], resourceSnapshots: [], sourceProvenance: { snapshot_id: "snapshot-1" } } };
    expect(exporter.fixtureVersion).toBe("phase-1a-working-output-v1");
    await expect(exporter.build({ ...input, exportType: "WORKING" })).resolves.toEqual(phase1aWorkingOutputFixture.bytes);
    await expect(exporter.build({ ...input, exportType: "OFFICIAL" })).rejects.toThrow("only supports WORKING");
  });
});
