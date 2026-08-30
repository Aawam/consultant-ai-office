import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { ExcelJsRabWorkbookExporter } from "@consultant-ai-office/infrastructure";
import type { Project, RabExportSnapshot, RabVersion } from "@consultant-ai-office/domain";
import {
  calculateBvOperation,
  calculateOfficialHsp,
  calculateProjectTotals,
  calculateRabItem,
  type AhspComponentInput,
} from "@consultant-ai-office/rab-calculation-engine";
import { goldenAhspCases, goldenRabCases } from "../../fixtures/golden-reference/rab-ee-golden";

const generatedAt = new Date("2026-08-31T00:00:00.000Z");
const outputDir = join(process.cwd(), "outputs", "phase-1a-golden");

const project: Project = {
  projectId: "golden-project-gt07-gt09",
  code: "GT-07-09",
  name: "Golden Output Validation",
  createdBy: "golden-fixture",
  createdAt: generatedAt,
};

const components: AhspComponentInput[] = [
  { componentId: "gt07-comp-1", ahspComponentId: "gt07-comp-1", resourceId: "gt07-resource-1", resourceName: "Pekerja", group: "TENAGA", coefficient: "0.75", resourceUnitRaw: "OH", resolutionState: "RESOLVED", basePrice: { priceValue: "176000", priceState: "SET", priceUnitRaw: "OH", zeroIntent: null } },
  { componentId: "gt07-comp-2", ahspComponentId: "gt07-comp-2", resourceId: "gt07-resource-2", resourceName: "Mandor", group: "TENAGA", coefficient: "0.038", resourceUnitRaw: "OH", resolutionState: "RESOLVED", basePrice: { priceValue: "206000", priceState: "SET", priceUnitRaw: "OH", zeroIntent: null } },
];
const hspOracle = calculateOfficialHsp({ components, ohProfitRate: goldenAhspCases.gt07.ohProfitRate });
const volumeOracle = calculateBvOperation({ kind: "SUM_CHILDREN", children: goldenRabCases.gt09.childVolumes });
const itemOracle = calculateRabItem({ itemId: "gt09-item-1", volume: volumeOracle, hspValue: hspOracle.hspValue });
const totalsOracle = calculateProjectTotals({ groupSubtotals: [itemOracle.itemValue], ppnRate: goldenRabCases.gt09.ppnRate });

const snapshot: RabExportSnapshot = {
  snapshotId: "golden-snapshot-gt07-gt09-v1",
  bvLines: [
    ...goldenRabCases.gt09.childVolumes.map((volume, index) => ({ bvId: "gt09-bv", bvLineId: `gt09-child-${index + 1}`, rabItemId: "gt09-item-1", lineOrder: index + 1, lineRole: "DETAIL" as const, description: `GT-09 child ${index + 1}`, parentBvLineId: "gt09-result", refBvLineId: null, formulaTemplateKey: "SCALAR_VALUE", formulaTemplateVersion: "1", formulaDisplay: volume, unitRaw: "m3", unitCanonical: "m3", volumeCalc: volume, isResult: false, dimensionSource: "golden-reference", note: null, operands: { value: volume } })),
    { bvId: "gt09-bv", bvLineId: "gt09-result", rabItemId: "gt09-item-1", lineOrder: 8, lineRole: "RESULT", description: "GT-09 summed volume", parentBvLineId: null, refBvLineId: null, formulaTemplateKey: "SUM_CHILDREN", formulaTemplateVersion: "1", formulaDisplay: "SUM of GT-09 child volumes", formulaExpression: 'SUMIFS(tbl_BV[volume_calc],tbl_BV[parent_bv_line_id],"gt09-result")', unitRaw: "m3", unitCanonical: "m3", volumeCalc: volumeOracle, isResult: true, dimensionSource: "golden-reference", note: null, operands: Object.fromEntries(goldenRabCases.gt09.childVolumes.map((value, index) => [`child_${index + 1}`, value])) },
  ],
  hspSnapshots: [{ hspId: "gt07-hsp", hspType: "AHSP", ahspId: "gt07-ahsp", sourceEdition: goldenAhspCases.gt07.sourceEdition, officialCode: goldenAhspCases.gt07.officialCode, officialDescription: "Pekerjaan tanah", sourceLocator: goldenAhspCases.gt07.source, workUnitRaw: "m3", workUnitCanonical: "m3", manualDescription: null, manualHsp: null, manualNote: null, laborSubtotal: hspOracle.laborSubtotal, materialSubtotal: hspOracle.materialSubtotal, equipmentSubtotal: hspOracle.equipmentSubtotal, directCost: hspOracle.directCost, ohValue: hspOracle.ohProfitValue, hspValue: hspOracle.hspValue }],
  componentSnapshots: components.map((component, index) => ({ ahspComponentId: component.ahspComponentId!, ahspId: "gt07-ahsp", hspId: "gt07-hsp", sourceOrder: index + 1, componentGroup: component.group, sourceResourceName: component.resourceName!, sourceResourceCode: null, sourceUnitRaw: component.resourceUnitRaw, sourceUnitCanonical: "OH", resourceId: component.resourceId!, coefficient: String(component.coefficient), priceUnit: "OH", priceValue: String(component.basePrice.priceValue), priceState: component.basePrice.priceState, sourceLocator: goldenAhspCases.gt07.source, componentCost: hspOracle.componentCosts[index].componentCost })),
  resourceSnapshots: components.map((component) => ({ resourceId: component.resourceId!, resourceType: component.group, normativeCode: null, resourceName: component.resourceName!, unitRawReference: component.resourceUnitRaw, unitCanonical: "OH", priceUnit: "OH", priceValue: String(component.basePrice.priceValue), priceState: component.basePrice.priceState })),
  sourceProvenance: { golden_cases: "GT-07,GT-09", ahsp_source: goldenAhspCases.gt07.source, bv_source: goldenRabCases.gt09.source, price_context: "GT-07 official AHSP price context" },
};

const rab: RabVersion = {
  rabVersionId: "golden-rab-v1",
  projectId: project.projectId,
  revisionOfRabVersionId: null,
  revisionNumber: 1,
  title: "Golden RAB GT-07 GT-09",
  status: "DRAFT",
  ohProfitRate: goldenAhspCases.gt07.ohProfitRate,
  ppnRate: goldenRabCases.gt09.ppnRate,
  items: [{ itemId: "gt09-item-1", description: "Pekerjaan tanah — GT-09", volume: volumeOracle, volumeUnitRaw: "m3", volumeSource: { kind: "BACKUP_VOLUME", bvReferenceId: "gt09-bv" }, hspId: "gt07-hsp", hsp: { kind: "OFFICIAL_AHSP", unitRaw: "m3", hspId: "gt07-hsp" } }],
  validation: { issues: [], reviewBlocked: false },
  calculationSnapshot: { calculatedAt: generatedAt, itemValues: { "gt09-item-1": itemOracle.itemValue }, totals: totalsOracle, exportSnapshot: snapshot },
  confirmedWarningCodes: [], createdBy: "golden-fixture", createdAt: generatedAt, updatedAt: generatedAt,
};

describe("Phase 1A golden output validation", () => {
  it("matches the official GT-07/GT-09 oracle and produces an error-free working workbook", async () => {
    expect(hspOracle.hspValue).toBe(goldenAhspCases.gt07.expectedHsp);
    expect(volumeOracle).toBe(goldenRabCases.gt09.expectedVolume);
    expect(itemOracle.itemValue).toBe(goldenRabCases.gt09.expectedItemValue);
    expect(totalsOracle.ppnValue).toBe(goldenRabCases.gt09.expectedPpn);
    expect(totalsOracle.totalBeforeRounding).toBe(goldenRabCases.gt09.expectedBeforeRounding);
    expect(totalsOracle.totalFinal).toBe(goldenRabCases.gt09.expectedFinal);
    expect(totalsOracle.roundingDifference).toBe(goldenRabCases.gt09.expectedRoundingDifference);

    const bytes = await new ExcelJsRabWorkbookExporter().build({ project, rab, exportType: "WORKING", artifactId: "golden-artifact-gt07-gt09", generatedAt, snapshot });
    await mkdir(outputDir, { recursive: true });
    const workbookPath = join(outputDir, "GT-07-GT-09-working.xlsx");
    await writeFile(workbookPath, bytes);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes);
    const visibleSheets = workbook.worksheets.filter((sheet) => sheet.state === "visible").map((sheet) => sheet.name);
    const hiddenSheets = workbook.worksheets.filter((sheet) => sheet.state !== "visible").map((sheet) => sheet.name);
    expect(visibleSheets).toEqual(["REKAP", "RAB", "BV", "ANALISA HSP", "HARGA DASAR"]);
    expect(hiddenSheets).toEqual(["PROJECT", "AHSP_COMPONENTS", "HSP_MAPPING", "CHECKS"]);
    expect(workbook.getWorksheet("REKAP")?.getCell("F3").value).toBe("NOT OFFICIAL");
    expect(workbook.getWorksheet("PROJECT")?.getCell("B4").value).toBe(snapshot.snapshotId);
    expect(workbook.getWorksheet("BV")?.getCell("L16").value).toMatchObject({ formula: expect.stringContaining("SUM"), result: Number(volumeOracle) });
    expect(workbook.getWorksheet("ANALISA HSP")?.getCell("G13").value).toMatchObject({ result: Number(hspOracle.hspValue) });
    expect(workbook.getWorksheet("RAB")?.getCell("E10").value).toMatchObject({ result: Number(volumeOracle) });
    expect(workbook.getWorksheet("RAB")?.getCell("F10").value).toMatchObject({ result: Number(hspOracle.hspValue) });
    expect(workbook.getWorksheet("RAB")?.getCell("G10").value).toMatchObject({ result: Number(itemOracle.itemValue) });
    expect(workbook.getWorksheet("REKAP")?.getCell("F11").value).toMatchObject({ result: Number(totalsOracle.ppnValue) });
    expect(workbook.getWorksheet("REKAP")?.getCell("F13").value).toMatchObject({ result: Number(totalsOracle.totalFinal) });

    let formulaCount = 0;
    const errors: string[] = [];
    for (const sheet of workbook.worksheets) sheet.eachRow((row) => row.eachCell((cell) => {
      const value = cell.value;
      if (value && typeof value === "object" && "formula" in value) formulaCount += 1;
      const serialized = JSON.stringify(value);
      if (serialized.includes("#REF!") || serialized.includes("#DIV/0!") || serialized.includes("#VALUE!") || serialized.includes("#NAME?") || serialized.includes("#N/A")) errors.push(`${sheet.name}!${cell.address}: ${serialized}`);
    }));
    expect(formulaCount).toBeGreaterThan(0);
    expect(errors).toEqual([]);
    const packageText = Buffer.from(bytes).toString("latin1");
    expect(packageText).not.toContain("externalLinks");
    expect(packageText).not.toContain("vbaProject.bin");
    await writeFile(join(outputDir, "GT-07-GT-09-comparison.json"), JSON.stringify({ generatedAt: generatedAt.toISOString(), snapshotId: snapshot.snapshotId, workbook: workbookPath, checks: { label: "NOT OFFICIAL", formulas: "PASS", formulaErrors: errors, externalLinks: "ABSENT", macros: "ABSENT", presentation: { visibleSheets, hiddenTraceabilitySheets: hiddenSheets, rawTechnicalIdsVisible: false, visualInspection: "outputs/phase-1a-golden/visual-inspection" }, item: { expected: goldenRabCases.gt09.expectedItemValue, actual: itemOracle.itemValue }, volume: { expected: goldenRabCases.gt09.expectedVolume, actual: volumeOracle }, hsp: { expected: goldenAhspCases.gt07.expectedHsp, actual: hspOracle.hspValue }, totals: totalsOracle } }, null, 2));
  });
});
