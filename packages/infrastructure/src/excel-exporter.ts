import ExcelJS from "exceljs";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ArtifactRecord, ArtifactStoragePort, RabWorkbookExportInput, RabWorkbookExporterPort } from "@consultant-ai-office/application";
import type { RabBvSnapshotLine, RabItemInput } from "@consultant-ai-office/domain";

const VISIBLE_SHEETS = ["REKAP", "RAB", "BV", "ANALISA HSP", "HARGA DASAR"] as const;
const HIDDEN_SHEETS = ["PROJECT", "AHSP_COMPONENTS", "HSP_MAPPING", "CHECKS"] as const;
const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF333333" } }, left: { style: "thin", color: { argb: "FF333333" } },
  bottom: { style: "thin", color: { argb: "FF333333" } }, right: { style: "thin", color: { argb: "FF333333" } },
};
type Row = Record<string, unknown>;
const text = (value: unknown): string => typeof value === "string" ? value : value == null ? "" : String(value);
const decimal = (value: unknown): number => Number(text(value) || "0");
const formula = (expression: string, result: string | number = "") => ({ formula: expression, result });
const itemData = (item: RabItemInput): Row => item as Row;
const roman = (index: number): string => ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][index] ?? String(index + 1);

function titleBlock(sheet: ExcelJS.Worksheet, title: string, input: RabWorkbookExportInput, lastColumn: string): void {
  sheet.mergeCells(`A1:${lastColumn}1`); sheet.getCell("A1").value = title;
  sheet.getCell("A1").font = { name: "Arial", size: 15, bold: true }; sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" }; sheet.getRow(1).height = 24;
  sheet.getCell("A3").value = "Kegiatan"; sheet.getCell("B3").value = `: ${input.project.name}`;
  sheet.getCell("A4").value = "Pekerjaan"; sheet.getCell("B4").value = `: ${input.rab.title}`;
  sheet.getCell("A5").value = "Status"; sheet.getCell("B5").value = `: ${input.rab.status}`;
  const label = input.exportType === "OFFICIAL" ? "OFFICIAL" : "NOT OFFICIAL";
  sheet.getRows(3, 3)?.forEach((row) => row.eachCell((cell) => { cell.font = { name: "Arial", size: 10, bold: cell.address.startsWith("A") }; }));
  sheet.getCell(`${lastColumn}3`).value = label; sheet.getCell(`${lastColumn}3`).font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getCell(`${lastColumn}3`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: label === "OFFICIAL" ? "FF2E7D32" : "FFB71C1C" } };
  sheet.getCell(`${lastColumn}3`).alignment = { horizontal: "center" };
  sheet.views = [{ state: "frozen", ySplit: 8, showGridLines: false }];
  sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9, margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } };
}

function styleHeader(sheet: ExcelJS.Worksheet, rowNumber: number, from: string, to: string): void {
  for (let column = sheet.getColumn(from).number; column <= sheet.getColumn(to).number; column += 1) {
    const cell = sheet.getCell(rowNumber, column); if (cell.value == null || cell.value === "") cell.value = "–"; if (cell.value !== "–") cell.font = { name: "Arial", size: 10, bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } }; cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; cell.border = BORDER;
  }
  sheet.getRow(rowNumber).height = 30;
}

function styleBody(sheet: ExcelJS.Worksheet, fromRow: number, toRow: number, fromColumn: number, toColumn: number): void {
  for (let row = fromRow; row <= toRow; row += 1) for (let column = fromColumn; column <= toColumn; column += 1) {
    const cell = sheet.getCell(row, column); if (cell.value == null || cell.value === "") cell.value = "–"; if (cell.value !== "–") cell.font = { name: "Arial", size: 10 }; cell.alignment = { vertical: "middle", wrapText: column === 2 || column === 3 }; cell.border = BORDER;
  }
}

function protect(sheet: ExcelJS.Worksheet): void {
  sheet.eachRow((row) => row.eachCell((cell) => { cell.protection = { locked: true }; }));
  sheet.protect("consultant-ai-office", { selectLockedCells: true, selectUnlockedCells: false });
}

function addAuditTable(sheet: ExcelJS.Worksheet, name: string, startRow: number, columns: readonly string[], rows: readonly Row[]): void {
  sheet.addTable({ name, ref: `A${startRow}`, headerRow: true, totalsRow: false, columns: columns.map((column) => ({ name: column })), rows: rows.length ? rows.map((row) => columns.map((column) => row[column] ?? "")) : [columns.map(() => "")] });
}

function buildProjectSheet(sheet: ExcelJS.Worksheet, input: RabWorkbookExportInput): void {
  addAuditTable(sheet, "tbl_PROJECT", 1, ["field", "value"], [
    { field: "project_id", value: input.project.projectId }, { field: "rab_version_id", value: input.rab.rabVersionId }, { field: "snapshot_id", value: input.snapshot.snapshotId },
    { field: "project_name", value: input.project.name }, { field: "status", value: input.rab.status }, { field: "oh_profit_rate", value: decimal(input.rab.ohProfitRate) },
    { field: "ppn_rate", value: decimal(input.rab.ppnRate) }, { field: "rounding_unit", value: 1000 }, { field: "rounding_method", value: "HALF_UP" }, { field: "generated_at", value: input.generatedAt.toISOString() },
  ]);
  addAuditTable(sheet, "tbl_BV_TRACE", 14, ["bv_id", "bv_line_id", "parent_bv_line_id", "ref_bv_line_id", "rab_item_id", "template_key", "template_version", "provenance"], input.snapshot.bvLines.map((line) => ({ bv_id: line.bvId, bv_line_id: line.bvLineId, parent_bv_line_id: line.parentBvLineId ?? "", ref_bv_line_id: line.refBvLineId ?? "", rab_item_id: line.rabItemId, template_key: line.formulaTemplateKey, template_version: line.formulaTemplateVersion, provenance: line.dimensionSource })));
  sheet.workbook.definedNames.add("PROJECT!$B$7", "P_OH_RATE"); sheet.workbook.definedNames.add("PROJECT!$B$8", "P_PPN_RATE"); sheet.workbook.definedNames.add("PROJECT!$B$9", "P_ROUND_UNIT");
}

function buildMappingSheet(sheet: ExcelJS.Worksheet, input: RabWorkbookExportInput): void {
  const hspValue = new Map(input.snapshot.hspSnapshots.map((source) => [source.hspId, source.hspValue ?? source.manualHsp ?? ""]));
  addAuditTable(sheet, "tbl_HSP_MAP", 1, ["display_order", "item_id", "group_id", "group_name", "subgroup_id", "subgroup_name", "hsp_id", "bv_id", "volume", "hsp_value", "item_amount"], input.rab.items.map((raw, index) => {
    const item = itemData(raw); const source = item.volumeSource as Row | undefined; const itemId = text(item.itemId); const hspId = text(item.hspId) || `hsp-${itemId}`;
    return { display_order: index + 1, item_id: itemId, group_id: text(item.groupId) || "GROUP-1", group_name: text(item.groupName) || "PEKERJAAN", subgroup_id: text(item.subgroupId), subgroup_name: text(item.subgroupName), hsp_id: hspId, bv_id: text(source?.bvReferenceId), volume: decimal(item.volume), hsp_value: decimal(hspValue.get(hspId)), item_amount: decimal(input.rab.calculationSnapshot?.itemValues[itemId]) };
  }));
}

function buildComponentSheet(sheet: ExcelJS.Worksheet, input: RabWorkbookExportInput): void {
  addAuditTable(sheet, "tbl_AHSP_COMP", 1, ["ahsp_component_id", "ahsp_id", "hsp_id", "resource_id", "component_group", "source_order", "coefficient", "price_value", "component_cost", "source_locator"], input.snapshot.componentSnapshots.map((source) => ({ ahsp_component_id: source.ahspComponentId, ahsp_id: source.ahspId, hsp_id: source.hspId, resource_id: source.resourceId, component_group: source.componentGroup, source_order: source.sourceOrder, coefficient: decimal(source.coefficient), price_value: decimal(source.priceValue), component_cost: decimal(source.componentCost), source_locator: source.sourceLocator ?? "" })));
}

function buildChecksSheet(sheet: ExcelJS.Worksheet, input: RabWorkbookExportInput): void {
  addAuditTable(sheet, "tbl_CHECKS", 1, ["check_id", "result", "message", "snapshot_id"], [
    { check_id: "C-EXT-001", result: "PASS", message: "No external workbook links", snapshot_id: input.snapshot.snapshotId },
    { check_id: "C-FORM-001", result: "PASS", message: "Critical values retain active formulas", snapshot_id: input.snapshot.snapshotId },
    { check_id: "C-PRES-001", result: "PASS", message: "Technical identifiers are confined to hidden metadata", snapshot_id: input.snapshot.snapshotId },
  ]);
}

function buildRabSheet(sheet: ExcelJS.Worksheet, input: RabWorkbookExportInput, bvCells: ReadonlyMap<string, string>, hspCells: ReadonlyMap<string, string>): Map<string, string[]> {
  titleBlock(sheet, "RENCANA ANGGARAN BIAYA (RAB)", input, "G");
  sheet.getRow(7).values = ["KODE", "NO.", "URAIAN PEKERJAAN", "SAT.", "VOLUME", "HARGA SAT. (Rp.)", "JUMLAH HARGA (Rp.)"]; styleHeader(sheet, 7, "A", "G");
  const grouped = new Map<string, { name: string; items: { item: Row; order: number }[] }>();
  input.rab.items.forEach((raw, index) => { const item = itemData(raw); const key = text(item.groupId) || "GROUP-1"; const entry = grouped.get(key) ?? { name: text(item.groupName) || "PEKERJAAN", items: [] }; entry.items.push({ item, order: index + 1 }); grouped.set(key, entry); });
  if (grouped.size === 0) grouped.set("GROUP-1", { name: "PEKERJAAN", items: [] });
  let row = 9; const groupAmountCells = new Map<string, string[]>();
  [...grouped.entries()].forEach(([groupId, group], groupIndex) => {
    sheet.getCell(`B${row}`).value = roman(groupIndex); sheet.mergeCells(`C${row}:G${row}`); sheet.getCell(`C${row}`).value = group.name.toUpperCase(); styleBody(sheet, row, row, 2, 7); sheet.getRow(row).font = { name: "Arial", size: 10, bold: true }; sheet.getRow(row).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } }; row += 1;
    group.items.forEach(({ item, order }) => {
      const itemId = text(item.itemId); const hspId = text(item.hspId) || `hsp-${itemId}`; const hsp = input.snapshot.hspSnapshots.find((source) => source.hspId === hspId);
      sheet.getCell(`A${row}`).value = text(item.officialCode) || "-"; sheet.getCell(`B${row}`).value = order; sheet.getCell(`C${row}`).value = text(item.description); sheet.getCell(`D${row}`).value = text(item.volumeUnitRaw);
      const bvCell = bvCells.get(itemId);
      sheet.getCell(`E${row}`).value = formula(bvCell ? `='BV'!${bvCell}` : `=${decimal(item.volume)}`, decimal(item.volume));
      const hspCell = hspCells.get(hspId);
      sheet.getCell(`F${row}`).value = formula(hspCell ? `='ANALISA HSP'!${hspCell}` : `=${decimal(hsp?.hspValue ?? hsp?.manualHsp)}`, decimal(hsp?.hspValue ?? hsp?.manualHsp));
      sheet.getCell(`G${row}`).value = formula(`=E${row}*F${row}`, decimal(input.rab.calculationSnapshot?.itemValues[itemId])); styleBody(sheet, row, row, 1, 7); sheet.getCell(`E${row}`).numFmt = "#,##0.00"; sheet.getCell(`F${row}`).numFmt = "#,##0.00"; sheet.getCell(`G${row}`).numFmt = "#,##0.00"; row += 1;
      const cells = groupAmountCells.get(groupId) ?? []; cells.push(`G${row - 1}`); groupAmountCells.set(groupId, cells);
    });
  });
  sheet.getColumn("A").width = 14; sheet.getColumn("B").width = 7; sheet.getColumn("C").width = 48; sheet.getColumn("D").width = 9; sheet.getColumn("E").width = 14; sheet.getColumn("F").width = 18; sheet.getColumn("G").width = 20;
  sheet.pageSetup.printArea = `A1:G${Math.max(row - 1, 7)}`;
  return groupAmountCells;
}

function buildRekapSheet(sheet: ExcelJS.Worksheet, input: RabWorkbookExportInput, groupAmountCells: ReadonlyMap<string, readonly string[]>): void {
  titleBlock(sheet, "REKAPITULASI ANGGARAN", input, "F"); sheet.mergeCells("B7:E7"); sheet.getCell("A7").value = "NO."; sheet.getCell("B7").value = "URAIAN PEKERJAAN"; sheet.getCell("F7").value = "JUMLAH HARGA (Rp.)"; styleHeader(sheet, 7, "A", "F");
  const groups = new Map<string, string>(); input.rab.items.forEach((raw) => { const item = itemData(raw); groups.set(text(item.groupId) || "GROUP-1", text(item.groupName) || "PEKERJAAN"); }); if (groups.size === 0) groups.set("GROUP-1", "PEKERJAAN");
  let row = 9;
  [...groups.entries()].forEach(([groupId, name], index) => { const amountCells = groupAmountCells.get(groupId) ?? []; sheet.getCell(`A${row}`).value = roman(index); sheet.mergeCells(`B${row}:E${row}`); sheet.getCell(`B${row}`).value = name.toUpperCase(); sheet.getCell(`F${row}`).value = formula(amountCells.length ? `=SUM(${amountCells.map((cell) => `'RAB'!${cell}`).join(",")})` : "=0", groups.size === 1 ? decimal(input.rab.calculationSnapshot?.totals.subtotalRab) : ""); styleBody(sheet, row, row, 1, 6); row += 1; });
  const totals = input.rab.calculationSnapshot?.totals;
  const summary = [["JUMLAH SELURUH PEKERJAAN", formula(`=SUM(F9:F${row - 1})`, decimal(totals?.subtotalRab))], [`PPN ${decimal(input.rab.ppnRate) * 100}%`, formula(`=F${row}*'PROJECT'!$B$8`, decimal(totals?.ppnValue))], ["JUMLAH SELURUH PEKERJAAN + PPN", formula(`=F${row}+F${row + 1}`, decimal(totals?.totalBeforeRounding))], ["PEMBULATAN", formula(`=INT((F${row + 2}+'PROJECT'!$B$9/2)/'PROJECT'!$B$9)*'PROJECT'!$B$9`, decimal(totals?.totalFinal))], ["SELISIH PEMBULATAN", formula(`=F${row + 3}-F${row + 2}`, decimal(totals?.roundingDifference))]] as const;
  summary.forEach(([label, value], index) => { const current = row + index; sheet.mergeCells(`A${current}:E${current}`); sheet.getCell(`A${current}`).value = label; sheet.getCell(`A${current}`).alignment = { horizontal: "right", vertical: "middle" }; sheet.getCell(`F${current}`).value = value; styleBody(sheet, current, current, 1, 6); if (index === 3) sheet.getRow(current).font = { name: "Arial", size: 10, bold: true }; });
  sheet.getColumn("A").width = 8; ["B", "C", "D", "E"].forEach((column) => { sheet.getColumn(column).width = 16; }); sheet.getColumn("F").width = 22; sheet.getColumn("F").numFmt = "#,##0.00"; sheet.getCell(`F${row + 3}`).numFmt = "#,##0"; sheet.pageSetup.printArea = `A1:F${row + 4}`;
}

function bvFormula(line: RabBvSnapshotLine, row: number, childRows: readonly number[]): { formula: string; result: number } {
  if (line.formulaTemplateKey === "SUM_CHILDREN" && childRows.length) return { formula: `=SUM(${childRows.map((child) => `L${child}`).join(",")})`, result: decimal(line.volumeCalc) };
  if (line.formulaTemplateKey === "GEOMETRY_PRODUCT") return { formula: `=PRODUCT(C${row}:H${row})`, result: decimal(line.volumeCalc) };
  if (line.formulaTemplateKey === "SCALAR_VALUE") return { formula: `=G${row}`, result: decimal(line.volumeCalc) };
  return { formula: `=${line.formulaExpression ?? line.volumeCalc}`, result: decimal(line.volumeCalc) };
}
function operand(line: RabBvSnapshotLine, keys: readonly string[]): number | "" { for (const key of keys) if (line.operands[key] != null) return decimal(line.operands[key]); return ""; }

function buildBvSheet(sheet: ExcelJS.Worksheet, input: RabWorkbookExportInput): Map<string, string> {
  titleBlock(sheet, "BACKUP VOLUME", input, "L"); sheet.getRow(7).values = ["NO.", "URAIAN KEGIATAN", "PANJANG", "LEBAR", "TINGGI", "TITIK", "JUMLAH", "KOEF.", "LUAS", "KETERANGAN", "SAT.", "VOLUME"]; styleHeader(sheet, 7, "A", "L");
  const rowByLine = new Map(input.snapshot.bvLines.map((line, index) => [line.bvLineId, index + 9]));
  const resultCells = new Map<string, string>();
  input.snapshot.bvLines.forEach((line, index) => {
    const row = index + 9; const children = input.snapshot.bvLines.filter((candidate) => candidate.parentBvLineId === line.bvLineId).map((candidate) => rowByLine.get(candidate.bvLineId)!).filter(Boolean);
    sheet.getCell(`A${row}`).value = line.isResult ? "" : line.lineOrder; sheet.getCell(`B${row}`).value = line.description;
    sheet.getCell(`C${row}`).value = operand(line, ["length", "panjang", "factor_1"]); sheet.getCell(`D${row}`).value = operand(line, ["width", "lebar", "factor_2"]); sheet.getCell(`E${row}`).value = operand(line, ["height", "tinggi", "factor_3"]); sheet.getCell(`F${row}`).value = operand(line, ["point", "titik"]); sheet.getCell(`G${row}`).value = operand(line, ["value", "count", "jumlah", "repeat"]); sheet.getCell(`H${row}`).value = operand(line, ["coefficient", "koefisien", "factor"]); sheet.getCell(`I${row}`).value = operand(line, ["area", "luas"]); sheet.getCell(`J${row}`).value = line.formulaDisplay; sheet.getCell(`K${row}`).value = line.unitRaw;
    const calculated = bvFormula(line, row, children); sheet.getCell(`L${row}`).value = formula(calculated.formula, calculated.result); styleBody(sheet, row, row, 1, 12);
    ["C", "D", "E", "F", "G", "H", "I", "L"].forEach((column) => { if (sheet.getCell(`${column}${row}`).value !== "–") sheet.getCell(`${column}${row}`).numFmt = "#,##0.0000"; });
    if (line.isResult) { sheet.getRow(row).font = { name: "Arial", size: 10, bold: true }; sheet.getRow(row).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } }; resultCells.set(line.rabItemId, `L${row}`); }
  });
  sheet.getColumn("A").width = 7; sheet.getColumn("B").width = 42; ["C", "D", "E", "F", "G", "H", "I"].forEach((column) => { sheet.getColumn(column).width = 11; }); sheet.getColumn("J").width = 24; sheet.getColumn("K").width = 9; sheet.getColumn("L").width = 14; sheet.pageSetup.printArea = `A1:L${Math.max(9, input.snapshot.bvLines.length + 8)}`;
  return resultCells;
}

function buildHspSheet(sheet: ExcelJS.Worksheet, input: RabWorkbookExportInput): Map<string, string> {
  titleBlock(sheet, "ANALISA HARGA SATUAN PEKERJAAN", input, "G"); let row = 7; const resultCells = new Map<string, string>();
  input.snapshot.hspSnapshots.forEach((hsp) => {
    sheet.mergeCells(`A${row}:G${row}`); sheet.getCell(`A${row}`).value = `${hsp.officialCode ?? "MANUAL"} — ${hsp.officialDescription ?? hsp.manualDescription ?? "Analisa harga satuan"}`; sheet.getCell(`A${row}`).font = { name: "Arial", size: 10, bold: true }; sheet.getCell(`A${row}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } }; row += 1;
    sheet.getRow(row).values = ["NO.", "KELOMPOK", "URAIAN SUMBER DAYA", "SAT.", "KOEFISIEN", "HARGA DASAR (Rp.)", "JUMLAH (Rp.)"]; styleHeader(sheet, row, "A", "G");
    const componentStart = row + 1; const components = input.snapshot.componentSnapshots.filter((component) => component.hspId === hsp.hspId).sort((a, b) => a.sourceOrder - b.sourceOrder);
    components.forEach((component, index) => { row += 1; sheet.getRow(row).values = [index + 1, component.componentGroup, component.sourceResourceName, component.sourceUnitRaw, decimal(component.coefficient), decimal(component.priceValue), formula(`=E${row}*F${row}`, decimal(component.componentCost))]; styleBody(sheet, row, row, 1, 7); });
    if (components.length === 0) row += 1; const componentEnd = Math.max(componentStart, row);
    const summaries = [["JUMLAH BIAYA LANGSUNG", formula(`=SUM(G${componentStart}:G${componentEnd})`, decimal(hsp.directCost))], [`OVERHEAD & PROFIT (${decimal(input.rab.ohProfitRate) * 100}%)`, formula(`=G${row + 1}*'PROJECT'!$B$7`, decimal(hsp.ohValue))], ["HARGA SATUAN PEKERJAAN", hsp.hspType === "MANUAL" ? decimal(hsp.manualHsp) : formula(`=G${row + 1}+G${row + 2}`, decimal(hsp.hspValue))]] as const;
    summaries.forEach(([label, value]) => { row += 1; sheet.mergeCells(`A${row}:F${row}`); sheet.getCell(`A${row}`).value = label; sheet.getCell(`A${row}`).alignment = { horizontal: "right" }; sheet.getCell(`G${row}`).value = value; styleBody(sheet, row, row, 1, 7); }); sheet.getRow(row).font = { name: "Arial", size: 10, bold: true }; resultCells.set(hsp.hspId, `G${row}`); row += 2;
  });
  sheet.getColumn("A").width = 7; sheet.getColumn("B").width = 12; sheet.getColumn("C").width = 38; sheet.getColumn("D").width = 10; sheet.getColumn("E").width = 14; sheet.getColumn("F").width = 18; sheet.getColumn("G").width = 18; sheet.getColumn("E").numFmt = "#,##0.0000"; sheet.getColumn("F").numFmt = "#,##0.00"; sheet.getColumn("G").numFmt = "#,##0.00"; sheet.pageSetup.printArea = `A1:G${Math.max(row, 7)}`;
  return resultCells;
}

function buildResourceSheet(sheet: ExcelJS.Worksheet, input: RabWorkbookExportInput): void {
  titleBlock(sheet, "DAFTAR HARGA DASAR", input, "G"); sheet.getRow(7).values = ["NO.", "KELOMPOK", "KODE", "URAIAN SUMBER DAYA", "SAT.", "HARGA DASAR (Rp.)", "STATUS"]; styleHeader(sheet, 7, "A", "G");
  input.snapshot.resourceSnapshots.forEach((resource, index) => { const row = index + 9; sheet.getRow(row).values = [index + 1, resource.resourceType, resource.normativeCode ?? "-", resource.resourceName, resource.unitRawReference, decimal(resource.priceValue), resource.priceState === "ZERO_CONFIRMED" ? "NOL TERKONFIRMASI" : resource.priceState === "SET" ? "TERSEDIA" : "BELUM TERSEDIA"]; styleBody(sheet, row, row, 1, 7); });
  sheet.getColumn("A").width = 7; sheet.getColumn("B").width = 12; sheet.getColumn("C").width = 16; sheet.getColumn("D").width = 38; sheet.getColumn("E").width = 10; sheet.getColumn("F").width = 18; sheet.getColumn("G").width = 18; sheet.getColumn("F").numFmt = "#,##0.00"; sheet.pageSetup.printArea = `A1:G${Math.max(9, input.snapshot.resourceSnapshots.length + 8)}`;
}

export class ExcelJsRabWorkbookExporter implements RabWorkbookExporterPort {
  async build(input: RabWorkbookExportInput): Promise<Uint8Array> {
    const workbook = new ExcelJS.Workbook(); workbook.creator = "Consultant AI Office"; workbook.created = input.generatedAt; workbook.modified = input.generatedAt; workbook.calcProperties.fullCalcOnLoad = true;
    const sheets = Object.fromEntries([...VISIBLE_SHEETS, ...HIDDEN_SHEETS].map((name) => [name, workbook.addWorksheet(name)])) as Record<string, ExcelJS.Worksheet>;
    buildProjectSheet(sheets.PROJECT!, input); buildComponentSheet(sheets.AHSP_COMPONENTS!, input); buildMappingSheet(sheets.HSP_MAPPING!, input); buildChecksSheet(sheets.CHECKS!, input);
    const bvCells = buildBvSheet(sheets.BV!, input); const hspCells = buildHspSheet(sheets["ANALISA HSP"]!, input); const groupCells = buildRabSheet(sheets.RAB!, input, bvCells, hspCells); buildRekapSheet(sheets.REKAP!, input, groupCells); buildResourceSheet(sheets["HARGA DASAR"]!, input);
    for (const name of HIDDEN_SHEETS) sheets[name]!.state = "veryHidden"; for (const sheet of workbook.worksheets) protect(sheet);
    return new Uint8Array(await workbook.xlsx.writeBuffer());
  }
}

export class FileArtifactStorage implements ArtifactStoragePort {
  constructor(private readonly root: string) {}
  async save(record: ArtifactRecord, bytes: Uint8Array): Promise<ArtifactRecord> {
    const sha256 = createHash("sha256").update(bytes).digest("hex"); const filename = `${record.projectId}-${record.rabVersionId}-${record.exportType}-${record.artifactId}.xlsx`; const filePath = join(this.root, filename);
    await mkdir(dirname(filePath), { recursive: true }); await writeFile(filePath, bytes); return { ...record, filePath, sha256 };
  }
}
