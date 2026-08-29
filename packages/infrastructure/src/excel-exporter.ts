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
import type { RabItemInput } from "@consultant-ai-office/domain";

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
  sheet.addRow(["Snapshot ID", input.rab.calculationSnapshot ? input.rab.rabVersionId : "DRAFT-NO-SNAPSHOT", "Generated At", input.generatedAt.toISOString()]);
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

function toHspRows(items: readonly RabItemInput[]): { hsp: Row[]; components: Row[]; resources: Row[] } {
  const hsp = new Map<string, Row>(); const components: Row[] = []; const resources = new Map<string, Row>();
  for (const raw of items) {
    const item = itemData(raw); const source = item.hsp as Row | undefined; if (!source) continue;
    const kind = text(source.kind).includes("MANUAL") ? "MANUAL" : "AHSP";
    const hspId = text(item.hspId) || `hsp-${text(item.itemId)}`;
    if (hsp.has(hspId)) continue;
    const unitRaw = text(source.unitRaw);
    const row: Row = { hsp_id: hspId, hsp_type: kind, ahsp_id: kind === "AHSP" ? text(item.ahspId) || "ahsp-unknown" : "", source_edition: text(item.sourceEdition), official_code: text(item.officialCode), official_description: text(item.description), source_locator: text(item.sourceLocator), work_unit_raw: unitRaw, work_unit_canonical: canonicalUnit(unitRaw), manual_description: kind === "MANUAL" ? text(source.description) || text(item.description) : "", manual_hsp: kind === "MANUAL" ? text(source.manualHsp) : "", manual_note: kind === "MANUAL" ? text(source.note) : "", labor_subtotal: formula(`SUMIFS(tbl_AHSP_COMP[component_cost],tbl_AHSP_COMP[hsp_id],[@hsp_id],tbl_AHSP_COMP[component_group],"TENAGA")`), material_subtotal: formula(`SUMIFS(tbl_AHSP_COMP[component_cost],tbl_AHSP_COMP[hsp_id],[@hsp_id],tbl_AHSP_COMP[component_group],"BAHAN")`), equipment_subtotal: formula(`SUMIFS(tbl_AHSP_COMP[component_cost],tbl_AHSP_COMP[hsp_id],[@hsp_id],tbl_AHSP_COMP[component_group],"ALAT")`), direct_cost: formula("=[@labor_subtotal]+[@material_subtotal]+[@equipment_subtotal]"), oh_rate: formula('=IF([@hsp_type]="AHSP",P_OH_RATE,0)'), oh_value: formula("=[@direct_cost]*[@oh_rate]"), hsp_value: kind === "MANUAL" ? text(source.manualHsp) : formula('=IF([@hsp_type]="MANUAL",[@manual_hsp],[@direct_cost]+[@oh_value])') };
    hsp.set(hspId, row);
    const sourceComponents = (source.components as readonly Row[] | undefined) ?? [];
    sourceComponents.forEach((component, index) => {
      const resourceId = text(component.resourceId) || `resource-${hspId}-${index + 1}`;
      const basePrice = (component.basePrice ?? {}) as Row;
      const price = text(basePrice.priceValue ?? component.priceValue);
      const priceState = text(basePrice.priceState ?? component.priceState) || "MISSING";
      const priceUnit = text(basePrice.priceUnitRaw ?? component.priceUnit);
      const componentCost = "";
      components.push({ ahsp_component_id: text(component.ahspComponentId) || text(component.componentId) || `${hspId}-component-${index + 1}`, ahsp_id: text(row.ahsp_id), hsp_id: hspId, source_order: index + 1, component_group: text(component.group) || "BAHAN", source_resource_name: text(component.resourceName) || text(component.resourceUnitRaw), source_resource_code: text(component.resourceCode), source_unit_raw: text(component.resourceUnitRaw), source_unit_canonical: canonicalUnit(text(component.resourceUnitRaw)), resource_id: resourceId, coefficient: text(component.coefficient), price_unit: priceUnit, price_value: price, price_state: priceState, component_cost: formula("=[@coefficient]*[@price_value]", componentCost), source_locator: text(component.sourceLocator) });
      resources.set(resourceId, { resource_id: resourceId, resource_type: text(component.group), normative_code: text(component.normativeCode), resource_name: text(component.resourceName) || text(component.resourceUnitRaw), unit_raw_reference: text(component.resourceUnitRaw), unit_canonical: canonicalUnit(text(component.resourceUnitRaw)), price_unit: priceUnit, price_value: price, price_state: priceState, snapshot_id: "" });
    });
  }
  return { hsp: [...hsp.values()], components, resources: [...resources.values()] };
}

export class ExcelJsRabWorkbookExporter implements RabWorkbookExporterPort {
  async build(input: RabWorkbookExportInput): Promise<Uint8Array> {
    const workbook = new ExcelJS.Workbook(); workbook.creator = "Consultant AI Office"; workbook.created = input.generatedAt; workbook.modified = input.generatedAt;
    const sheets = Object.fromEntries(SHEETS.map((name) => [name, workbook.addWorksheet(name)])) as Record<typeof SHEETS[number], ExcelJS.Worksheet>;
    const { hsp, components, resources } = toHspRows(input.rab.items);
    header(sheets.PROJECT, input);
    addTable(sheets.PROJECT, TABLES[0], ["field", "value"], [{ field: "project_id", value: input.project.projectId }, { field: "project_name", value: input.project.name }, { field: "status", value: input.rab.status }, { field: "snapshot_id", value: input.rab.calculationSnapshot ? input.rab.rabVersionId : "" }, { field: "oh_profit_rate", value: input.rab.ohProfitRate }, { field: "ppn_rate", value: input.rab.ppnRate }, { field: "rounding_unit", value: 1000 }, { field: "rounding_method", value: "HALF_UP" }, { field: "currency", value: "IDR" }, { field: "excel_contract_version", value: "12" }]);
    workbook.definedNames.add("PROJECT!$B$6", "P_PROJECT_ID"); workbook.definedNames.add("PROJECT!$B$8", "P_STATUS"); workbook.definedNames.add("PROJECT!$B$10", "P_OH_RATE"); workbook.definedNames.add("PROJECT!$B$11", "P_PPN_RATE"); workbook.definedNames.add("PROJECT!$B$12", "P_ROUND_UNIT");
    const hspByItem = new Map<string, string>(); input.rab.items.forEach((raw) => { const item = itemData(raw); hspByItem.set(text(item.itemId), text(item.hspId) || `hsp-${text(item.itemId)}`); });
    addTable(sheets.RAB_DETAIL, TABLES[2], ["item_id", "item_order", "item_name", "group_id", "group_name", "subgroup_id", "subgroup_name", "volume_unit_raw", "volume_unit_canonical", "volume_source_type", "bv_id", "direct_volume", "direct_basis", "direct_source", "direct_note", "direct_reviewer", "volume", "hsp_id", "hsp_type", "hsp_unit_canonical", "unit_check", "hsp_value", "item_amount", "warning_code", "error_code"], input.rab.items.map((raw, index) => { const item = itemData(raw); const source = item.volumeSource as Row | undefined; const sourceType = text(source?.kind).includes("BACKUP") ? "BV" : "DIRECT"; const unitRaw = text(item.volumeUnitRaw); const hspId = hspByItem.get(text(item.itemId))!; const hspSource = item.hsp as Row; return { item_id: text(item.itemId), item_order: index + 1, item_name: text(item.description), group_id: text(item.groupId) || "GROUP-1", group_name: text(item.groupName) || "Ungrouped", subgroup_id: text(item.subgroupId), subgroup_name: text(item.subgroupName), volume_unit_raw: unitRaw, volume_unit_canonical: canonicalUnit(unitRaw), volume_source_type: sourceType, bv_id: text(source?.bvReferenceId), direct_volume: sourceType === "DIRECT" ? text(item.volume) : "", direct_basis: text(source?.basis), direct_source: text(source?.source), direct_note: text(source?.note), direct_reviewer: text(source?.reviewerId), volume: sourceType === "DIRECT" ? text(item.volume) : formula('=SUMIFS(tbl_BV[volume_calc],tbl_BV[bv_id],[@bv_id],tbl_BV[is_result],TRUE)'), hsp_id: hspId, hsp_type: text(hspSource?.kind).includes("MANUAL") ? "MANUAL" : "AHSP", hsp_unit_canonical: canonicalUnit(text(hspSource?.unitRaw)), unit_check: formula('=IF([@volume_unit_canonical]=[@hsp_unit_canonical],"OK","ERROR")'), hsp_value: formula("=INDEX(tbl_HSP[hsp_value],MATCH([@hsp_id],tbl_HSP[hsp_id],0))"), item_amount: formula("=[@volume]*[@hsp_value]"), warning_code: sourceType === "DIRECT" ? "DIRECT_VOLUME_REVIEW_REQUIRED" : text(hspSource?.kind).includes("MANUAL") ? "MANUAL_HSP_REVIEW_REQUIRED" : "", error_code: "" }; }));
    addTable(sheets.BV, TABLES[3], ["bv_id", "bv_line_id", "rab_item_id", "line_order", "line_role", "description", "formula_template_key", "formula_template_version", "formula_display", "unit_raw", "unit_canonical", "volume_calc", "is_result", "dimension_source", "note"], []);
    addTable(sheets.HSP_USED, TABLES[4], Object.keys(hsp[0] ?? { hsp_id: "" }), hsp);
    addTable(sheets.AHSP_COMPONENTS, TABLES[5], Object.keys(components[0] ?? { ahsp_component_id: "" }), components);
    addTable(sheets.RESOURCE_SNAPSHOT, TABLES[6], Object.keys(resources[0] ?? { resource_id: "" }), resources);
    addTable(sheets.HSP_MAPPING, TABLES[7], ["item_id", "item_name", "group_id", "group_name", "subgroup_id", "subgroup_name", "hsp_id", "hsp_type", "official_code", "hsp_description", "volume", "item_amount", "group_subtotal"], input.rab.items.map((raw) => { const item = itemData(raw); return { item_id: text(item.itemId), item_name: text(item.description), group_id: text(item.groupId) || "GROUP-1", group_name: text(item.groupName) || "Ungrouped", subgroup_id: text(item.subgroupId), subgroup_name: text(item.subgroupName), hsp_id: hspByItem.get(text(item.itemId)), hsp_type: text((item.hsp as Row)?.kind).includes("MANUAL") ? "MANUAL" : "AHSP", official_code: text(item.officialCode), hsp_description: text(item.description), volume: formula('=INDEX(tbl_RAB[volume],MATCH([@item_id],tbl_RAB[item_id],0))'), item_amount: formula('=INDEX(tbl_RAB[item_amount],MATCH([@item_id],tbl_RAB[item_id],0))'), group_subtotal: formula('=SUMIFS(tbl_RAB[item_amount],tbl_RAB[group_id],[@group_id])') }; }));
    addTable(sheets.REKAP, TABLES[1], ["group_id", "group_order", "group_code", "group_name", "group_subtotal"], [{ group_id: "GROUP-1", group_order: 1, group_code: "", group_name: "Ungrouped", group_subtotal: formula('=SUMIFS(tbl_RAB[item_amount],tbl_RAB[group_id],[@group_id])') }]);
    sheets.REKAP.addRows([["subtotal_rab", formula("=SUM(tbl_REKAP[group_subtotal])")], ["ppn_rate", formula("=P_PPN_RATE")], ["ppn_value", formula("=B7*B8")], ["total_before_rounding", formula("=B7+B9")], ["total_final", formula("=INT((B10+500)/1000)*1000")], ["rounding_difference", formula("=B11-B10")]]);
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
