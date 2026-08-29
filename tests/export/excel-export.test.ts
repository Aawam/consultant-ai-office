import { describe, expect, it } from "vitest";
import { ExportRabExcelUseCase } from "@consultant-ai-office/application";
import type { Project, RabVersion, RequestContext } from "@consultant-ai-office/domain";

const project: Project = { projectId: "project-1", code: "EXP-01", name: "Exporter Test", createdBy: "tester", createdAt: new Date("2026-01-01T00:00:00.000Z") };
const rab = (status: RabVersion["status"]): RabVersion => ({ rabVersionId: "rab-1", projectId: project.projectId, revisionOfRabVersionId: null, revisionNumber: 1, title: "Test RAB", status, ohProfitRate: "0.10", ppnRate: "0.11", items: [], validation: null, calculationSnapshot: status === "DRAFT" ? null : { calculatedAt: project.createdAt, itemValues: {}, totals: { subtotalRab: "0", ppnValue: "0", totalBeforeRounding: "0", totalFinal: "0", roundingDifference: "0" }, exportSnapshot: { snapshotId: "snapshot-1", bvLines: [], hspSnapshots: [], componentSnapshots: [], resourceSnapshots: [], sourceProvenance: { snapshot_id: "snapshot-1" } } }, confirmedWarningCodes: [], createdBy: "tester", createdAt: project.createdAt, updatedAt: project.createdAt });
const context = (role: "TECHNICAL" | "ADMIN"): RequestContext => ({ requestId: `request-${role}`, projectId: project.projectId, actor: { actorId: role.toLowerCase(), actorType: "HUMAN", actorRole: role } });

function dependencies(status: RabVersion["status"]) {
  const record = { artifactId: "artifact-1", projectId: project.projectId, rabVersionId: "rab-1", snapshotId: "snapshot-1", exportType: "OFFICIAL" as const, status, generatedBy: "admin", generatedAt: project.createdAt, filePath: "", sha256: "" };
  return { rabs: { get: async () => rab(status) }, projects: { get: async () => project }, exporter: { build: async () => new Uint8Array([1, 2, 3]) }, artifacts: { save: async () => record }, clock: { now: () => project.createdAt }, ids: { next: () => "artifact-1" } };
}

describe("RAB Excel export application boundary", () => {
  it("allows Working export for TECHNICAL DRAFT", async () => {
    const deps = dependencies("DRAFT");
    const result = await new ExportRabExcelUseCase(deps).execute(context("TECHNICAL"), { rabVersionId: "rab-1", exportType: "WORKING" });
    expect(result.bytes).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("rejects Official export for non-FINAL", async () => {
    await expect(new ExportRabExcelUseCase(dependencies("REVIEW")).execute(context("ADMIN"), { rabVersionId: "rab-1", exportType: "OFFICIAL" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rejects Official export for TECHNICAL", async () => {
    await expect(new ExportRabExcelUseCase(dependencies("FINAL")).execute(context("TECHNICAL"), { rabVersionId: "rab-1", exportType: "OFFICIAL" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows Official export for ADMIN FINAL", async () => {
    const result = await new ExportRabExcelUseCase(dependencies("FINAL")).execute(context("ADMIN"), { rabVersionId: "rab-1", exportType: "OFFICIAL" });
    expect(result.artifact.status).toBe("FINAL");
    expect(result.artifact.exportType).toBe("OFFICIAL");
  });

  it("allows Working export for ADMIN REVIEW", async () => {
    const result = await new ExportRabExcelUseCase(dependencies("REVIEW")).execute(context("ADMIN"), { rabVersionId: "rab-1", exportType: "WORKING" });
    expect(result.artifact.status).toBe("REVIEW");
  });
});
