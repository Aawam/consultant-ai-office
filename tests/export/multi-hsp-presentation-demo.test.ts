import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { ExcelJsRabWorkbookExporter } from "@consultant-ai-office/infrastructure";
import type { Project, RabExportSnapshot, RabVersion } from "@consultant-ai-office/domain";
import {
  calculateOfficialHsp,
  calculateProjectTotals,
  calculateRabItem,
  type AhspComponentInput,
} from "@consultant-ai-office/rab-calculation-engine";
import { goldenAhspCases } from "../../fixtures/golden-reference/rab-ee-golden";

const generatedAt = new Date("2026-08-31T00:00:00.000Z");
const outputDir = join(process.cwd(), "outputs", "01a04d4d-b17c-7212-9796-f7f88d59062b");

type HspFixture = {
  hspId: string;
  ahspId: string;
  code: string;
  description: string;
  unit: string;
  source: string;
  sourceEdition: string;
  components: AhspComponentInput[];
};

const gt07: HspFixture = {
  hspId: "demo-hsp-gt07",
  ahspId: "demo-ahsp-gt07",
  code: goldenAhspCases.gt07.officialCode,
  description: "Penggalian 1 m3 tanah biasa sedalam 0 s.d. 1 m untuk volume s.d. 200 m3 secara manual",
  unit: "m3",
  source: goldenAhspCases.gt07.source,
  sourceEdition: goldenAhspCases.gt07.sourceEdition,
  components: [
    { componentId: "gt07-c1", ahspComponentId: "gt07-c1", resourceId: "gt07-r1", resourceName: "Pekerja", group: "TENAGA", coefficient: "0.75", resourceUnitRaw: "OH", resolutionState: "RESOLVED", basePrice: { priceValue: "176000", priceState: "SET", priceUnitRaw: "OH", zeroIntent: null } },
    { componentId: "gt07-c2", ahspComponentId: "gt07-c2", resourceId: "gt07-r2", resourceName: "Mandor", group: "TENAGA", coefficient: "0.038", resourceUnitRaw: "OH", resolutionState: "RESOLVED", basePrice: { priceValue: "206000", priceState: "SET", priceUnitRaw: "OH", zeroIntent: null } },
  ],
};

const gt06: HspFixture = {
  hspId: "demo-hsp-gt06",
  ahspId: "demo-ahsp-gt06",
  code: goldenAhspCases.gt06.officialCode,
  description: "1 m3 beton mutu sedang f'c 25 MPa, slump (100 ± 25) mm, agregat maks 19 mm secara semi mekanis",
  unit: "m3",
  source: goldenAhspCases.gt06.source,
  sourceEdition: goldenAhspCases.gt06.sourceEdition,
  components: [
    { componentId: "gt06-c1", ahspComponentId: "gt06-c1", resourceId: "gt06-r1", resourceName: "Pekerja", group: "TENAGA", coefficient: "1", resourceUnitRaw: "OH", resolutionState: "RESOLVED", basePrice: { priceValue: "176000", priceState: "SET", priceUnitRaw: "OH", zeroIntent: null } },
    { componentId: "gt06-c2", ahspComponentId: "gt06-c2", resourceId: "gt06-r2", resourceName: "Tukang batu", group: "TENAGA", coefficient: "0.25", resourceUnitRaw: "OH", resolutionState: "RESOLVED", basePrice: { priceValue: "186000", priceState: "SET", priceUnitRaw: "OH", zeroIntent: null } },
    { componentId: "gt06-c3", ahspComponentId: "gt06-c3", resourceId: "gt06-r3", resourceName: "Kepala Tukang", group: "TENAGA", coefficient: "0.025", resourceUnitRaw: "OH", resolutionState: "RESOLVED", basePrice: { priceValue: "196000", priceState: "SET", priceUnitRaw: "OH", zeroIntent: null } },
    { componentId: "gt06-c4", ahspComponentId: "gt06-c4", resourceId: "gt06-r4", resourceName: "Mandor", group: "TENAGA", coefficient: "0.1", resourceUnitRaw: "OH", resolutionState: "RESOLVED", basePrice: { priceValue: "206000", priceState: "SET", priceUnitRaw: "OH", zeroIntent: null } },
    { componentId: "gt06-c5", ahspComponentId: "gt06-c5", resourceId: "gt06-r5", resourceName: "Semen Portland (PC)", group: "BAHAN", coefficient: "407", resourceUnitRaw: "kg", resolutionState: "RESOLVED", basePrice: { priceValue: "1820", priceState: "SET", priceUnitRaw: "kg", zeroIntent: null } },
    { componentId: "gt06-c6", ahspComponentId: "gt06-c6", resourceId: "gt06-r6", resourceName: "Pasir beton", group: "BAHAN", coefficient: "731", resourceUnitRaw: "kg", resolutionState: "RESOLVED", basePrice: { priceValue: "474.4285714285714285714285714285714285714", priceState: "SET", priceUnitRaw: "kg", zeroIntent: null } },
    { componentId: "gt06-c7", ahspComponentId: "gt06-c7", resourceId: "gt06-r7", resourceName: "Batu split 2/3", group: "BAHAN", coefficient: "1009", resourceUnitRaw: "kg", resolutionState: "RESOLVED", basePrice: { priceValue: "396.637037037037037037037037037037037037", priceState: "SET", priceUnitRaw: "kg", zeroIntent: null } },
    { componentId: "gt06-c8", ahspComponentId: "gt06-c8", resourceId: "gt06-r8", resourceName: "Air", group: "BAHAN", coefficient: "202", resourceUnitRaw: "liter", resolutionState: "RESOLVED", basePrice: { priceValue: "100", priceState: "SET", priceUnitRaw: "liter", zeroIntent: null } },
    { componentId: "gt06-c9", ahspComponentId: "gt06-c9", resourceId: "gt06-r9", resourceName: "Molen beton mixer 350 liter", group: "ALAT", coefficient: "0.1475", resourceUnitRaw: "hari", resolutionState: "RESOLVED", basePrice: { priceValue: "200000", priceState: "SET", priceUnitRaw: "hari", zeroIntent: null } },
  ],
};

const fixtures = [gt07, gt06];
const oracles = new Map(fixtures.map((fixture) => [fixture.hspId, calculateOfficialHsp({ components: fixture.components, ohProfitRate: "0.10" })]));
const itemValues = Object.fromEntries(fixtures.map((fixture, index) => {
  const itemId = `demo-item-${index + 1}`;
  return [itemId, calculateRabItem({ itemId, volume: "1", hspValue: oracles.get(fixture.hspId)!.hspValue }).itemValue];
}));
const totals = calculateProjectTotals({ groupSubtotals: Object.values(itemValues), ppnRate: "0.11" });

const project: Project = {
  projectId: "demo-project-multi-hsp",
  code: "DEMO-MULTI-HSP",
  name: "PRESENTATION DEMO — NOT GOLDEN",
  createdBy: "presentation-demo",
  createdAt: generatedAt,
};

const snapshot: RabExportSnapshot = {
  snapshotId: "demo-snapshot-multi-hsp-v1",
  bvLines: fixtures.map((fixture, index) => ({
    bvId: `demo-bv-${index + 1}`,
    bvLineId: `demo-bv-line-${index + 1}`,
    rabItemId: `demo-item-${index + 1}`,
    lineOrder: index + 1,
    lineRole: "RESULT" as const,
    description: `Volume presentasi ${fixture.code} — bukan Golden Reference`,
    parentBvLineId: null,
    refBvLineId: null,
    formulaTemplateKey: "SCALAR_VALUE",
    formulaTemplateVersion: "1",
    formulaDisplay: "Demo inspeksi HSP",
    unitRaw: fixture.unit,
    unitCanonical: fixture.unit,
    volumeCalc: "1",
    isResult: true,
    dimensionSource: "PRESENTATION_DEMO_NOT_GOLDEN",
    note: "Volume 1 hanya untuk membaca struktur Analisa HSP",
    operands: { value: "1" },
  })),
  hspSnapshots: fixtures.map((fixture) => {
    const oracle = oracles.get(fixture.hspId)!;
    return {
      hspId: fixture.hspId,
      hspType: "AHSP" as const,
      ahspId: fixture.ahspId,
      sourceEdition: fixture.sourceEdition,
      officialCode: fixture.code,
      officialDescription: fixture.description,
      sourceLocator: fixture.source,
      workUnitRaw: fixture.unit,
      workUnitCanonical: fixture.unit,
      manualDescription: null,
      manualHsp: null,
      manualNote: null,
      laborSubtotal: oracle.laborSubtotal,
      materialSubtotal: oracle.materialSubtotal,
      equipmentSubtotal: oracle.equipmentSubtotal,
      directCost: oracle.directCost,
      ohValue: oracle.ohProfitValue,
      hspValue: oracle.hspValue,
    };
  }),
  componentSnapshots: fixtures.flatMap((fixture) => {
    const oracle = oracles.get(fixture.hspId)!;
    return fixture.components.map((component, index) => ({
      ahspComponentId: component.ahspComponentId!,
      ahspId: fixture.ahspId,
      hspId: fixture.hspId,
      sourceOrder: index + 1,
      componentGroup: component.group,
      sourceResourceName: component.resourceName!,
      sourceResourceCode: null,
      sourceUnitRaw: component.resourceUnitRaw,
      sourceUnitCanonical: component.resourceUnitRaw,
      resourceId: component.resourceId!,
      coefficient: String(component.coefficient),
      priceUnit: component.resourceUnitRaw,
      priceValue: String(component.basePrice.priceValue),
      priceState: component.basePrice.priceState,
      sourceLocator: fixture.source,
      componentCost: oracle.componentCosts[index].componentCost,
    }));
  }),
  resourceSnapshots: fixtures.flatMap((fixture) => fixture.components.map((component) => ({
    resourceId: component.resourceId!,
    resourceType: component.group,
    normativeCode: null,
    resourceName: component.resourceName!,
    unitRawReference: component.resourceUnitRaw,
    unitCanonical: component.resourceUnitRaw,
    priceUnit: component.resourceUnitRaw,
    priceValue: String(component.basePrice.priceValue),
    priceState: component.basePrice.priceState,
  }))),
  sourceProvenance: {
    classification: "PRESENTATION_DEMO_NOT_GOLDEN",
    ahsp_cases: "GT-07,GT-06",
    gt07_source: gt07.source,
    gt06_source: gt06.source,
    volume_context: "Display-only volume 1 per item",
  },
};

const rab: RabVersion = {
  rabVersionId: "demo-rab-multi-hsp-v1",
  projectId: project.projectId,
  revisionOfRabVersionId: null,
  revisionNumber: 1,
  title: "PRESENTATION DEMO — DUA ANALISA HSP",
  status: "DRAFT",
  ohProfitRate: "0.10",
  ppnRate: "0.11",
  items: fixtures.map((fixture, index) => ({
    itemId: `demo-item-${index + 1}`,
    description: fixture.description,
    volume: "1",
    volumeUnitRaw: fixture.unit,
    volumeSource: { kind: "BACKUP_VOLUME", bvReferenceId: `demo-bv-${index + 1}` },
    hspId: fixture.hspId,
    hsp: { kind: "OFFICIAL_AHSP", unitRaw: fixture.unit, hspId: fixture.hspId },
    officialCode: fixture.code,
    groupId: index === 0 ? "PEKERJAAN-TANAH" : "PEKERJAAN-BETON",
    groupName: index === 0 ? "PEKERJAAN TANAH" : "PEKERJAAN BETON",
  })) as RabVersion["items"],
  validation: { issues: [], reviewBlocked: false },
  calculationSnapshot: { calculatedAt: generatedAt, itemValues, totals, exportSnapshot: snapshot },
  confirmedWarningCodes: [],
  createdBy: "presentation-demo",
  createdAt: generatedAt,
  updatedAt: generatedAt,
};

describe("Phase 1A multi-HSP presentation demo", () => {
  it("shows two source-backed HSP analyses without exposing technical IDs", async () => {
    expect(oracles.get(gt07.hspId)?.hspValue).toBe(goldenAhspCases.gt07.expectedHsp);
    expect(oracles.get(gt06.hspId)?.hspValue).toBe(goldenAhspCases.gt06.expectedHsp);

    const bytes = await new ExcelJsRabWorkbookExporter().build({
      project,
      rab,
      exportType: "WORKING",
      artifactId: "presentation-demo-multi-hsp",
      generatedAt,
      snapshot,
    });
    await mkdir(outputDir, { recursive: true });
    await writeFile(join(outputDir, "Phase-1A-multi-HSP-presentation-demo.xlsx"), bytes);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes);
    const visibleSheets = workbook.worksheets.filter((sheet) => sheet.state === "visible");
    const hiddenSheets = workbook.worksheets.filter((sheet) => sheet.state !== "visible");
    expect(visibleSheets.map((sheet) => sheet.name)).toEqual(["REKAP", "RAB", "BV", "ANALISA HSP", "HARGA DASAR"]);
    expect(hiddenSheets.map((sheet) => sheet.name)).toEqual(["PROJECT", "AHSP_COMPONENTS", "HSP_MAPPING", "CHECKS"]);
    expect(hiddenSheets.every((sheet) => sheet.state === "veryHidden")).toBe(true);
    expect(workbook.getWorksheet("REKAP")?.getCell("F3").value).toBe("NOT OFFICIAL");
    expect(workbook.getWorksheet("ANALISA HSP")?.getCell("A7").value).toContain(gt07.code);
    expect(workbook.getWorksheet("ANALISA HSP")?.getCell("A15").value).toContain(gt06.code);
    expect(workbook.getWorksheet("ANALISA HSP")?.getCell("G13").value).toMatchObject({ result: Number(goldenAhspCases.gt07.expectedHsp) });
    expect(workbook.getWorksheet("ANALISA HSP")?.getCell("G28").value).toMatchObject({ result: Number(goldenAhspCases.gt06.expectedHsp) });

    const technicalIds = [project.projectId, rab.rabVersionId, snapshot.snapshotId, ...fixtures.flatMap((fixture) => [fixture.hspId, fixture.ahspId]), ...rab.items.map((item) => item.itemId)];
    const visibleText = visibleSheets.flatMap((sheet) => {
      const values: string[] = [];
      sheet.eachRow((row) => row.eachCell((cell) => values.push(JSON.stringify(cell.value))));
      return values;
    }).join("\n");
    expect(technicalIds.some((id) => visibleText.includes(id))).toBe(false);

    let formulaCount = 0;
    const formulaErrors: string[] = [];
    for (const sheet of workbook.worksheets) sheet.eachRow((row) => row.eachCell((cell) => {
      const value = cell.value;
      if (value && typeof value === "object" && "formula" in value) formulaCount += 1;
      const serialized = JSON.stringify(value);
      if (["#REF!", "#DIV/0!", "#VALUE!", "#NAME?", "#N/A"].some((error) => serialized.includes(error))) formulaErrors.push(`${sheet.name}!${cell.address}: ${serialized}`);
    }));
    expect(formulaCount).toBeGreaterThan(0);
    expect(formulaErrors).toEqual([]);
    const packageText = Buffer.from(bytes).toString("latin1");
    expect(packageText).not.toContain("externalLinks");
    expect(packageText).not.toContain("vbaProject.bin");
  });
});
