import type { RabComponentSnapshot, RabExportSnapshot, RabHspSnapshot, RabResourceSnapshot, RabVersion, RequestContext } from "@consultant-ai-office/domain";
import { RoleAuthorizationPolicy } from "./authorization";
import { ApplicationError } from "./errors";
import type {
  ExportRabDependencies,
  ExportRabRequest,
  ExportRabResponse,
  RabExporterUseCase,
} from "./export-ports";

function assertProjectContext(context: RequestContext, rab: RabVersion): void {
  if (context.projectId === null || context.projectId !== rab.projectId) {
    throw new ApplicationError("FORBIDDEN", "RAB is outside the active project context");
  }
}

function sourceRow(value: unknown): Record<string, unknown> { return typeof value === "object" && value !== null ? value as Record<string, unknown> : {}; }
function sourceText(row: Record<string, unknown>, key: string): string { return typeof row[key] === "string" ? row[key] as string : ""; }

export function buildRabExportSnapshot(rab: RabVersion, snapshotId: string): RabExportSnapshot {
  const hsps = new Map<string, RabHspSnapshot>(); const components: RabComponentSnapshot[] = []; const resources = new Map<string, RabResourceSnapshot>();
  for (const raw of rab.items) {
    const item = sourceRow(raw); const hsp = sourceRow(item.hsp); const hspId = sourceText(item, "hspId") || `hsp-${sourceText(item, "itemId")}`; const manual = sourceText(hsp, "kind").includes("MANUAL");
    hsps.set(hspId, { hspId, hspType: manual ? "MANUAL" : "AHSP", ahspId: manual ? null : sourceText(item, "ahspId") || null, sourceEdition: sourceText(item, "sourceEdition") || null, officialCode: sourceText(item, "officialCode") || null, officialDescription: sourceText(item, "description") || null, sourceLocator: sourceText(item, "sourceLocator") || null, workUnitRaw: sourceText(hsp, "unitRaw"), workUnitCanonical: sourceText(hsp, "unitCanonical") || sourceText(hsp, "unitRaw"), manualDescription: manual ? sourceText(hsp, "description") || sourceText(item, "description") : null, manualHsp: manual ? sourceText(hsp, "manualHsp") : null, manualNote: manual ? sourceText(hsp, "note") : null });
    const hspComponents = Array.isArray(hsp.components) ? hsp.components : [];
    hspComponents.forEach((value, index) => { const component = sourceRow(value); const base = sourceRow(component.basePrice); const resourceId = sourceText(component, "resourceId") || `${hspId}-resource-${index + 1}`; const componentId = sourceText(component, "ahspComponentId") || sourceText(component, "componentId") || `${hspId}-component-${index + 1}`; const componentSnapshot: RabComponentSnapshot = { ahspComponentId: componentId, ahspId: sourceText(item, "ahspId"), hspId, sourceOrder: index + 1, componentGroup: (sourceText(component, "group") || "BAHAN") as RabComponentSnapshot["componentGroup"], sourceResourceName: sourceText(component, "resourceName") || sourceText(component, "resourceUnitRaw"), sourceResourceCode: sourceText(component, "resourceCode") || null, sourceUnitRaw: sourceText(component, "resourceUnitRaw"), sourceUnitCanonical: sourceText(component, "resourceUnitCanonical") || sourceText(component, "resourceUnitRaw"), resourceId, coefficient: sourceText(component, "coefficient"), priceUnit: sourceText(base, "priceUnitRaw") || sourceText(component, "priceUnit"), priceValue: sourceText(base, "priceValue") || null, priceState: (sourceText(base, "priceState") || "MISSING") as RabComponentSnapshot["priceState"], sourceLocator: sourceText(component, "sourceLocator") || null }; components.push(componentSnapshot); resources.set(resourceId, { resourceId, resourceType: componentSnapshot.componentGroup, normativeCode: componentSnapshot.sourceResourceCode, resourceName: componentSnapshot.sourceResourceName, unitRawReference: componentSnapshot.sourceUnitRaw, unitCanonical: componentSnapshot.sourceUnitCanonical, priceUnit: componentSnapshot.priceUnit, priceValue: componentSnapshot.priceValue, priceState: componentSnapshot.priceState }); });
  }
  const bvLines = rab.items.flatMap((raw) => { const lines = sourceRow(raw).bvLines; return Array.isArray(lines) ? lines as RabExportSnapshot["bvLines"] : []; });
  return { snapshotId, bvLines, hspSnapshots: [...hsps.values()], componentSnapshots: components, resourceSnapshots: [...resources.values()], sourceProvenance: { snapshot_id: snapshotId, rab_version_id: rab.rabVersionId } };
}

export class ExportRabExcelUseCase implements RabExporterUseCase {
  constructor(private readonly dependencies: ExportRabDependencies) {}

  async execute(context: RequestContext, request: ExportRabRequest): Promise<ExportRabResponse> {
    const allowedRoles = request.exportType === "OFFICIAL" ? ["ADMIN"] as const : ["TECHNICAL", "ADMIN"] as const;
    RoleAuthorizationPolicy.assertAllowed(context.actor, allowedRoles, `rab.export.${request.exportType.toLowerCase()}`);
    const rab = await this.dependencies.rabs.get(request.rabVersionId);
    if (!rab) throw new ApplicationError("NOT_FOUND", "RAB version was not found");
    assertProjectContext(context, rab);
    if (request.exportType === "OFFICIAL" && rab.status !== "FINAL") {
      throw new ApplicationError("VALIDATION_ERROR", "Official Excel export requires FINAL RAB");
    }
    if (request.exportType === "WORKING" && rab.status === "FINAL") {
      throw new ApplicationError("VALIDATION_ERROR", "Working Excel export is limited to DRAFT or REVIEW");
    }
    if ((rab.status === "REVIEW" || rab.status === "FINAL") && (rab.calculationSnapshot === null || !rab.calculationSnapshot.exportSnapshot)) {
      throw new ApplicationError("VALIDATION_ERROR", "RAB export requires a bound calculation snapshot");
    }
    const project = await this.dependencies.projects.get(rab.projectId, context.actor.actorId);
    if (!project) throw new ApplicationError("NOT_FOUND", "Project was not found or is not accessible");

    const generatedAt = this.dependencies.clock.now();
    const artifactId = this.dependencies.ids.next();
    const persistedSnapshot = rab.calculationSnapshot?.exportSnapshot;
    const snapshot = persistedSnapshot ?? buildRabExportSnapshot(rab, `DRAFT-${rab.rabVersionId}`);
    const bytes = await this.dependencies.exporter.build({ project, rab, exportType: request.exportType, artifactId, generatedAt, snapshot });
    const artifact = await this.dependencies.artifacts.save({
      artifactId,
      projectId: rab.projectId,
      rabVersionId: rab.rabVersionId,
      snapshotId: snapshot.snapshotId,
      exportType: request.exportType,
      status: rab.status,
      generatedBy: context.actor.actorId,
      generatedAt,
      filePath: "",
      sha256: "",
    }, bytes);
    return { artifact, bytes };
  }
}
