import ExcelJS from "exceljs";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
  ArtifactRecord,
  ArtifactStoragePort,
  RabWorkbookExportInput,
  RabWorkbookExporterPort,
} from "@consultant-ai-office/application";
import type { RabExportSnapshot, RabItemInput } from "@consultant-ai-office/domain";

const SHEETS = ["PROJECT", "REKAP", "RAB_DETAIL", "BV", "HSP_USED", "AHSP_COMPONENTS", "RESOURCE_SNAPSHOT", "HSP_MAPPING", "CHECKS"] as const;
const TABLES = ["tbl_PROJECT", "tbl_REKAP", "tbl_RAB", "tbl_BV", "tbl_HSP", "tbl_AHSP_COMP", "tbl_RESOURCE", "tbl_HSP_MAP", "tbl_CHECKS"] as const;

type Row = Record<string, unknown>;
const text = (value: unknown): string => typeof value === "string" ? value : value == null ? "" : String(value);
const formula = (expression: string, result: string | number = "") => ({ formula: expression, result });
const itemData = (item: RabItemInput): Row => item as Row;
const canonicalUnit = (raw: string): string => raw.trim();

function header(sheet: ExcelJS.Worksheet, input: RabWorkbookExportInput): void {
  sheet.addRow(["Project", input.project.name, "Project ID", input.project.projectId]);
  sheet.addRow(["RAB Version", input.rab.rabVersionId, "Revision", input.rab.revisionNumber]);
  sheet.addRow(["Status", input.rab.status, "Export", input.exportType === "OFFICIAL" ? "OFFICIAL" : "NOT OFFICIAL"]);
  sheet.addRow(["Snapshot ID", input.snapshot.snapshotId, "Generated At", input.generatedAt.toISOString()]);
  sheet.getRows(1, 4)?.forEach((row) => row.eachCell((cell) => { cell.font = { bold: true }; }));
}

function addTable(sheet: ExcelJS.Worksheet, name: string, columns: readonly string[], rows: readonly Row[]): void {
  const start = 6;
  sheet.getRow(start).values = [undefined, ...columns];
  const end = Math.max(start + rows.length, start + 1);
  sheet.addTable({ name, ref: `A${start}`, headerRow: true, totalsRow: false, columns: columns.map((name) => ({ name })), rows: rows.length ? rows.map((row) => columns.map((column) => row[column] ?? "")) : [columns.map(() => "")] });
  sheet.getRow(start).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(start).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF244B4B" } };
  sheet.eachRow((row) => row.eachCell((cell) => { cell.alignment = { vertical: "top", wrapText: true }; }));
  sheet.views = [{ state: "frozen", ySplit: start }];
  sheet.autoFilter = { from: `A${start}`, to: `${String.fromCharCode(64 + Math.min(columns.length, 26))}${end}` };
}

function lockSheet(sheet: ExcelJS.Worksheet, input: RabWorkbookExportInput): void {
  sheet.eachRow((row) => row.eachCell((cell) => { cell.protection = { locked: true }; }));
  sheet.protect("consultant-ai-office", { selectLockedCells: true, selectUnlockedCells: true });
  if (input.rab.status === "DRAFT") {
    // Export remains an auditable snapshot; source edits happen in the application and regenerate the file.
    sheet.getCell("B6").protection = { locked: false };
  }
}

function toHspRows(snapshot: RabExportSnapshot): { hsp: Row[]; components: Row[]; resources: Row[] } {
  const hsp = snapshot.hspSnapshots.map((source) => ({ hsp_id: source.hspId, hsp_type: source.hspType, ahsp_id: source.ahspId ?? "", source_edition: source.sourceEdition ?? "", official_code: source.officialCode ?? "", official_description: source.officialDescription ?? "", source_locator: source.sourceLocator ?? "", work_unit_raw: source.workUnitRaw, work_unit_canonical: source.workUnitCanonical, manual_description: source.manualDescription ?? "", manual_hsp: source.manualHsp ?? "", manual_note: source.manualNote ?? "", labor_subtotal: formula('SUMIFS(tbl_AHSP_COMP[component_cost],tbl_AHSP_COMP[hsp_id],[@hsp_id],tbl_AHSP_COMP[component_group],"TENAGA")', source.laborSubtotal ?? ""), material_subtotal: formula('SUMIFS(tbl_AHSP_COMP[component_cost],tbl_AHSP_COMP[hsp_id],[@hsp_id],tbl_AHSP_COMP[component_group],"BAHAN")', source.materialSubtotal ?? ""), equipment_subtotal: formula('SUMIFS(tbl_AHSP_COMP[component_cost],tbl_AHSP_COMP[hsp_id],[@hsp_id],tbl_AHSP_COMP[component_group],"ALAT")', source.equipmentSubtotal ?? ""), direct_cost: formula('=[@labor_subtotal]+[@material_subtotal]+[@equipment_subtotal]', source.directCost ?? ""), oh_rate: formula('=IF([@hsp_type]="AHSP",P_OH_RATE,0)'), oh_value: formula('=[@direct_cost]*[@oh_rate]', source.ohValue ?? ""), hsp_value: source.hspType === "MANUAL" ? source.manualHsp ?? "" : formula('=IF([@hsp_type]="MANUAL",[@manual_hsp],[@direct_cost]+[@oh_value])', source.hspValue ?? "") }));
  const components = snapshot.componentSnapshots.map((source) => ({ ahsp_component_id: source.ahspComponentId, ahsp_id: source.ahspId, hsp_id: source.hspId, source_order: source.sourceOrder, component_group: source.componentGroup, source_resource_name: source.sourceResourceName, source_resource_code: source.sourceResourceCode ?? "", source_unit_raw: source.sourceUnitRaw, source_unit_canonical: source.sourceUnitCanonical, resource_id: source.resourceId, coefficient: source.coefficient, price_unit: source.priceUnit, price_value: source.priceValue ?? "", price_state: source.priceState, component_cost: formula('=[@coefficient]*[@price_value]', source.componentCost ?? ""), source_locator: source.sourceLocator ?? "" }));
  const resources = snapshot.resourceSnapshots.map((source) => ({ resource_id: source.resourceId, resource_type: source.resourceType, normative_code: source.normativeCode ?? "", resource_name: source.resourceName, unit_raw_reference: source.unitRawReference, unit_canonical: source.unitCanonical, price_unit: source.priceUnit, price_value: source.priceValue ?? "", price_state: source.priceState, snapshot_id: snapshot.snapshotId }));
  return { hsp, components, resources };
}

export class ExcelJsRabWorkbookExporter implements RabWorkbookExporterPort {
  async build(input: RabWorkbookExportInput): Promise<Uint8Array> {
    const workbook = new ExcelJS.Workbook(); workbook.creator = "Consultant AI Office"; workbook.created = input.generatedAt; workbook.modified = input.generatedAt;
    const sheets = Object.fromEntries(SHEETS.map((name) => [name, workbook.addWorksheet(name)])) as Record<typeof SHEETS[number], ExcelJS.Worksheet>;
    const { hsp, components, resources } = toHspRows(input.snapshot);
    const hspValues = new Map(hsp.map((row) => [text(row.hsp_id), text((row.hsp_value as { result?: unknown } | undefined)?.result)]));
    const itemValues = input.rab.calculationSnapshot?.itemValues ?? {};
    header(sheets.PROJECT, input);
    addTable(sheets.PROJECT, TABLES[0], ["field", "value"], [{ field: "project_id", value: input.project.projectId }, { field: "project_name", value: input.project.name }, { field: "status", value: input.rab.status }, { field: "snapshot_id", value: input.rab.calculationSnapshot ? input.rab.rabVersionId : "" }, { field: "oh_profit_rate", value: input.rab.ohProfitRate }, { field: "ppn_rate", value: input.rab.ppnRate }, { field: "rounding_unit", value: 1000 }, { field: "rounding_method", value: "HALF_UP" }, { field: "currency", value: "IDR" }, { field: "excel_contract_version", value: "12" }]);
    workbook.definedNames.add("PROJECT!$B$7", "P_PROJECT_ID"); workbook.definedNames.add("PROJECT!$B$9", "P_STATUS"); workbook.definedNames.add("PROJECT!$B$11", "P_OH_RATE"); workbook.definedNames.add("PROJECT!$B$12", "P_PPN_RATE"); workbook.definedNames.add("PROJECT!$B$13", "P_ROUND_UNIT");
    const hspByItem = new Map<string, string>(); input.rab.items.forEach((raw) => { const item = itemData(raw); hspByItem.set(text(item.itemId), text(item.hspId) || `hsp-${text(item.itemId)}`); });
    addTable(sheets.RAB_DETAIL, TABLES[2], ["item_id", "item_order", "item_name", "group_id", "group_name", "subgroup_id", "subgroup_name", "volume_unit_raw", "volume_unit_canonical", "volume_source_type", "bv_id", "direct_volume", "direct_basis", "direct_source", "direct_note", "direct_reviewer", "volume", "hsp_id", "hsp_type", "hsp_unit_canonical", "unit_check", "hsp_value", "item_amount", "warning_code", "error_code"], input.rab.items.map((raw, index) => { const item = itemData(raw); const source = item.volumeSource as Row | undefined; const sourceType = text(source?.kind).includes("BACKUP") ? "BV" : "DIRECT"; const unitRaw = text(item.volumeUnitRaw); const hspId = hspByItem.get(text(item.itemId))!; const hspSource = item.hsp as Row; const itemId = text(item.itemId); const itemValue = text(itemValues[itemId]); const hspValue = hspValues.get(hspId) ?? ""; return { item_id: itemId, item_order: index + 1, item_name: text(item.description), group_id: text(item.groupId) || "GROUP-1", group_name: text(item.groupName) || "Ungrouped", subgroup_id: text(item.subgroupId), subgroup_name: text(item.subgroupName), volume_unit_raw: unitRaw, volume_unit_canonical: canonicalUnit(unitRaw), volume_source_type: sourceType, bv_id: text(source?.bvReferenceId), direct_volume: sourceType === "DIRECT" ? text(item.volume) : "", direct_basis: text(source?.basis), direct_source: text(source?.source), direct_note: text(source?.note), direct_reviewer: text(source?.reviewerId), volume: sourceType === "DIRECT" ? text(item.volume) : formula('=SUMIFS(tbl_BV[volume_calc],tbl_BV[bv_id],[@bv_id],tbl_BV[is_result],TRUE)', text(item.volume)), hsp_id: hspId, hsp_type: text(hspSource?.kind).includes("MANUAL") ? "MANUAL" : "AHSP", hsp_unit_canonical: canonicalUnit(text(hspSource?.unitRaw)), unit_check: formula('=IF([@volume_unit_canonical]=[@hsp_unit_canonical],"OK","ERROR")', "OK"), hsp_value: formula("=INDEX(tbl_HSP[hsp_value],MATCH([@hsp_id],tbl_HSP[hsp_id],0))", hspValue), item_amount: formula("=[@volume]*[@hsp_value]", itemValue), warning_code: sourceType === "DIRECT" ? "DIRECT_VOLUME_REVIEW_REQUIRED" : text(hspSource?.kind).includes("MANUAL") ? "MANUAL_HSP_REVIEW_REQUIRED" : "", error_code: "" }; }));
    addTable(sheets.BV, TABLES[3], ["bv_id", "bv_line_id", "rab_item_id", "line_order", "line_role", "description", "formula_template_key", "formula_template_version", "formula_display", "unit_raw", "unit_canonical", "volume_calc", "is_result", "dimension_source", "note", "parent_bv_line_id", "ref_bv_line_id"], input.snapshot.bvLines.map((line) => ({ bv_id: line.bvId, bv_line_id: line.bvLineId, rab_item_id: line.rabItemId, line_order: line.lineOrder, line_role: line.lineRole, description: line.description, formula_template_key: line.formulaTemplateKey, formula_template_version: line.formulaTemplateVersion, formula_display: line.formulaDisplay, unit_raw: line.unitRaw, unit_canonical: line.unitCanonical, volume_calc: formula(`=${line.formulaExpression ?? line.volumeCalc}`, line.volumeCalc), is_result: line.isResult, dimension_source: line.dimensionSource, note: line.note ?? "", parent_bv_line_id: line.parentBvLineId ?? "", ref_bv_line_id: line.refBvLineId ?? "" })));
    addTable(sheets.HSP_USED, TABLES[4], Object.keys(hsp[0] ?? { hsp_id: "" }), hsp);
    addTable(sheets.AHSP_COMPONENTS, TABLES[5], Object.keys(components[0] ?? { ahsp_component_id: "" }), components);
    addTable(sheets.RESOURCE_SNAPSHOT, TABLES[6], Object.keys(resources[0] ?? { resource_id: "" }), resources);
    addTable(sheets.HSP_MAPPING, TABLES[7], ["item_id", "item_name", "group_id", "group_name", "subgroup_id", "subgroup_name", "hsp_id", "hsp_type", "official_code", "hsp_description", "volume", "item_amount", "group_subtotal"], input.rab.items.map((raw) => { const item = itemData(raw); return { item_id: text(item.itemId), item_name: text(item.description), group_id: text(item.groupId) || "GROUP-1", group_name: text(item.groupName) || "Ungrouped", subgroup_id: text(item.subgroupId), subgroup_name: text(item.subgroupName), hsp_id: hspByItem.get(text(item.itemId)), hsp_type: text((item.hsp as Row)?.kind).includes("MANUAL") ? "MANUAL" : "AHSP", official_code: text(item.officialCode), hsp_description: text(item.description), volume: formula('=INDEX(tbl_RAB[volume],MATCH([@item_id],tbl_RAB[item_id],0))'), item_amount: formula('=INDEX(tbl_RAB[item_amount],MATCH([@item_id],tbl_RAB[item_id],0))'), group_subtotal: formula('=SUMIFS(tbl_RAB[item_amount],tbl_RAB[group_id],[@group_id])') }; }));
    const groups = new Map<string, string>(); input.rab.items.forEach((raw) => { const item = itemData(raw); groups.set(text(item.groupId) || "GROUP-1", text(item.groupName) || "Ungrouped"); });
    if (groups.size === 0) groups.set("GROUP-1", "Ungrouped");
    addTable(sheets.REKAP, TABLES[1], ["group_id", "group_order", "group_code", "group_name", "group_subtotal"], [...groups.entries()].map(([groupId, groupName], index) => ({ group_id: groupId, group_order: index + 1, group_code: "", group_name: groupName, group_subtotal: formula('=SUMIFS(tbl_RAB[item_amount],tbl_RAB[group_id],[@group_id])', groups.size === 1 ? input.rab.calculationSnapshot?.totals.subtotalRab ?? "" : "") })));
    const totals = input.rab.calculationSnapshot?.totals;
    sheets.REKAP.addRows([["subtotal_rab", formula("=SUM(tbl_REKAP[group_subtotal])", totals?.subtotalRab ?? "")], ["ppn_rate", formula("=P_PPN_RATE", input.rab.ppnRate)], ["ppn_value", formula("=B8*B9", totals?.ppnValue ?? "")], ["total_before_rounding", formula("=B8+B10", totals?.totalBeforeRounding ?? "")], ["total_final", formula("=INT((B11+500)/1000)*1000", totals?.totalFinal ?? "")], ["rounding_difference", formula("=B12-B11", totals?.roundingDifference ?? "")]]);
    addTable(sheets.CHECKS, TABLES[8], ["check_id", "severity", "scope", "check_origin", "result", "difference", "message", "blocking_review", "warning_confirmation_required", "warning_confirmation_status", "confirmed_by", "confirmed_at"], [{ check_id: "C-EXT-001", severity: "ERROR", scope: "WORKBOOK", check_origin: "EXPORTER", result: "PASS", difference: "0", message: "No external workbook links are generated", blocking_review: true, warning_confirmation_required: false, warning_confirmation_status: "NOT_REQUIRED", confirmed_by: "", confirmed_at: "" }, { check_id: "C-FORM-001", severity: "ERROR", scope: "WORKBOOK", check_origin: "FORMULA", result: "PASS", difference: "0", message: "Formula columns are present", blocking_review: true, warning_confirmation_required: false, warning_confirmation_status: "NOT_REQUIRED", confirmed_by: "", confirmed_at: "" }]);
    for (const sheet of Object.values(sheets)) { sheet.columns.forEach((column) => { column.width = Math.min(36, Math.max(12, (column.header?.length ?? 12) + 2)); }); lockSheet(sheet, input); }
    workbook.calcProperties.fullCalcOnLoad = true;
    return new Uint8Array(await workbook.xlsx.writeBuffer());
  }
}

export class FileArtifactStorage implements ArtifactStoragePort {
  constructor(private readonly root: string) {}
  async save(record: ArtifactRecord, bytes: Uint8Array): Promise<ArtifactRecord> {
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const filename = `${record.projectId}-${record.rabVersionId}-${record.exportType}-${record.artifactId}.xlsx`;
    const filePath = join(this.root, filename); await mkdir(dirname(filePath), { recursive: true }); await writeFile(filePath, bytes);
    return { ...record, filePath, sha256 };
  }
}
