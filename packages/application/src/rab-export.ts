import type { RabVersion, RequestContext } from "@consultant-ai-office/domain";
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
    if ((rab.status === "REVIEW" || rab.status === "FINAL") && rab.calculationSnapshot === null) {
      throw new ApplicationError("VALIDATION_ERROR", "RAB export requires a bound calculation snapshot");
    }
    const project = await this.dependencies.projects.get(rab.projectId, context.actor.actorId);
    if (!project) throw new ApplicationError("NOT_FOUND", "Project was not found or is not accessible");

    const generatedAt = this.dependencies.clock.now();
    const artifactId = this.dependencies.ids.next();
    const bytes = await this.dependencies.exporter.build({ project, rab, exportType: request.exportType, artifactId, generatedAt });
    const artifact = await this.dependencies.artifacts.save({
      artifactId,
      projectId: rab.projectId,
      rabVersionId: rab.rabVersionId,
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
