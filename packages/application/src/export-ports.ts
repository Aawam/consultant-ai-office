import type { Project, RabExportSnapshot, RabVersion, RequestContext } from "@consultant-ai-office/domain";

export type RabExportType = "WORKING" | "OFFICIAL";

export interface ProjectExportSource {
  get(projectId: string, actorId: string): Promise<Project | null>;
}

export interface RabWorkbookExportInput {
  readonly project: Project;
  readonly rab: RabVersion;
  readonly exportType: RabExportType;
  readonly artifactId: string;
  readonly generatedAt: Date;
  readonly snapshot: RabExportSnapshot;
}

export interface RabWorkbookExporterPort {
  build(input: RabWorkbookExportInput): Promise<Uint8Array>;
}

export interface ArtifactRecord {
  readonly artifactId: string;
  readonly projectId: string;
  readonly rabVersionId: string;
  readonly snapshotId: string;
  readonly exportType: RabExportType;
  readonly status: RabVersion["status"];
  readonly generatedBy: string;
  readonly generatedAt: Date;
  readonly filePath: string;
  readonly sha256: string;
}

export interface ArtifactStoragePort {
  save(record: ArtifactRecord, bytes: Uint8Array): Promise<ArtifactRecord>;
}

export interface ExportRabRequest {
  readonly rabVersionId: string;
  readonly exportType: RabExportType;
}

export interface ExportRabResponse {
  readonly artifact: ArtifactRecord;
  readonly bytes: Uint8Array;
}

export interface ExportRabDependencies {
  readonly rabs: { get(rabVersionId: string): Promise<RabVersion | null> };
  readonly projects: ProjectExportSource;
  readonly exporter: RabWorkbookExporterPort;
  readonly artifacts: ArtifactStoragePort;
  readonly clock: { now(): Date };
  readonly ids: { next(): string };
}

export interface RabExporterUseCase {
  execute(context: RequestContext, request: ExportRabRequest): Promise<ExportRabResponse>;
}
