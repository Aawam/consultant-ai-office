import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { ExcelJsRabWorkbookExporter } from "@consultant-ai-office/infrastructure";
import type { Project, RabVersion } from "@consultant-ai-office/domain";

const project: Project = { projectId: "project-1", code: "EXP-01", name: "Exporter Test", createdBy: "tester", createdAt: new Date("2026-01-01T00:00:00.000Z") };
const rab: RabVersion = { rabVersionId: "rab-1", projectId: project.projectId, revisionOfRabVersionId: null, revisionNumber: 1, title: "Test RAB", status: "FINAL", ohProfitRate: "0.10", ppnRate: "0.11", items: [{ itemId: "item-1", description: "Manual item", volume: "2", volumeUnitRaw: "m2", volumeSource: { kind: "DIRECT", quantityKind: "SIMPLE", basis: "jumlah", source: "test", note: "test", reviewerId: "reviewer" }, hsp: { kind: "MANUAL_NON_AHSP", unitRaw: "m2", manualHsp: "100", note: "manual source" } }], validation: { issues: [{ code: "MANUAL_HSP_REVIEW_REQUIRED", severity: "WARNING", path: "items[0]", message: "review" }], reviewBlocked: false }, calculationSnapshot: { calculatedAt: new Date("2026-01-01T00:00:00.000Z"), itemValues: { "item-1": "200" }, totals: { subtotalRab: "200", ppnValue: "22", totalBeforeRounding: "222", totalFinal: "0", roundingDifference: "-222" } }, confirmedWarningCodes: ["MANUAL_HSP_REVIEW_REQUIRED"], createdBy: "tester", createdAt: project.createdAt, updatedAt: project.createdAt };

describe("Excel RAB workbook exporter", () => {
  it("creates a valid self-contained nine-sheet formula-active workbook", async () => {
    const bytes = await new ExcelJsRabWorkbookExporter().build({ project, rab, exportType: "OFFICIAL", artifactId: "artifact-1", generatedAt: project.createdAt, snapshot: { snapshotId: "snapshot-1", bvLines: [{ bvId: "bv-1", bvLineId: "bv-line-1", rabItemId: "item-1", lineOrder: 1, lineRole: "RESULT", description: "Controlled result", parentBvLineId: null, refBvLineId: null, formulaTemplateKey: "SCALAR_VALUE", formulaTemplateVersion: "1", formulaDisplay: "2", unitRaw: "m2", unitCanonical: "m2", volumeCalc: "2", isResult: true, dimensionSource: "measurement", note: null, operands: { value: "2" } }], hspSnapshots: [{ hspId: "hsp-item-1", hspType: "MANUAL", ahspId: null, sourceEdition: null, officialCode: null, officialDescription: null, sourceLocator: null, workUnitRaw: "m2", workUnitCanonical: "m2", manualDescription: "Manual item", manualHsp: "100", manualNote: "manual source" }], componentSnapshots: [], resourceSnapshots: [], sourceProvenance: { snapshot_id: "snapshot-1" } } });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["PROJECT", "REKAP", "RAB_DETAIL", "BV", "HSP_USED", "AHSP_COMPONENTS", "RESOURCE_SNAPSHOT", "HSP_MAPPING", "CHECKS"]);
    expect(workbook.getWorksheet("RAB_DETAIL")?.getTables().map((table) => table.name)).toContain("tbl_RAB");
    expect(workbook.getWorksheet("RAB_DETAIL")?.getCell("V7").value).toMatchObject({ formula: expect.stringContaining("INDEX") });
    expect(workbook.getWorksheet("REKAP")?.getCell("B12").value).toMatchObject({ formula: expect.stringContaining("INT") });
    expect(workbook.getWorksheet("BV")?.getCell("L7").value).toMatchObject({ formula: expect.stringContaining("2") });
    expect(workbook.worksheets.every((sheet) => sheet.protect !== undefined)).toBe(true);
  });
});
