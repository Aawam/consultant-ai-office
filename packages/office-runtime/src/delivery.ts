import {
  ApplicationError,
  previewProjectCreation,
  type CreateProjectResponse,
  type CreateProjectUseCase,
} from "@consultant-ai-office/application";
import type {
  ActiveProjectContext,
  Project,
  RabVersion,
  RequestContext,
} from "@consultant-ai-office/domain";

export const OFFICE_WORKFLOW_CONTRACT_VERSION = "office-workflow-v1" as const;
export const OFFICE_WORKFLOW_READ_OPERATION = "workflow.read" as const;

const OFFICE_WORKFLOW_ACTIONS = [
  "create_project",
  "select_project",
  "create_draft",
  "export_excel",
  "submit_review",
  "finalize",
  "create_revision",
] as const;

export type OfficeWorkflowAction = (typeof OFFICE_WORKFLOW_ACTIONS)[number];

export type BrowserActorRole = "TECHNICAL" | "ADMIN";

export interface OfficeProjectView {
  readonly transport: { readonly projectId: string };
  readonly display: { readonly code: string; readonly name: string };
}

export interface OfficeRabView {
  readonly transport: { readonly projectId: string; readonly rabVersionId: string };
  readonly display: {
    readonly title: string;
    readonly revisionNumber: number;
    readonly lifecycle: RabVersion["status"];
  };
  readonly snapshot: { readonly available: boolean; readonly calculatedAt: string | null };
  readonly calculation: null | {
    readonly totals: RabVersion["calculationSnapshot"] extends infer Snapshot
      ? Snapshot extends null
        ? never
        : Snapshot extends { readonly totals: infer Totals }
          ? Totals
          : never
      : never;
  };
  readonly validation: null | {
    readonly reviewBlocked: boolean;
    readonly issues: readonly { readonly severity: "ERROR" | "WARNING" | "INFO"; readonly message: string }[];
  };
  readonly approval: { readonly confirmedWarningCount: number };
}

export interface OfficeWorkflowReadModel {
  readonly projects: readonly OfficeProjectView[];
  readonly activeProject: OfficeProjectView | null;
  readonly rab: OfficeRabView | null;
}

export interface OfficeWorkflowGetRequest {
  readonly contractVersion: typeof OFFICE_WORKFLOW_CONTRACT_VERSION;
  readonly operation: typeof OFFICE_WORKFLOW_READ_OPERATION;
  readonly projectId: string | null;
  readonly rabVersionId: string | null;
}

export interface OfficeWorkflowPostRequest {
  readonly contractVersion: typeof OFFICE_WORKFLOW_CONTRACT_VERSION;
  readonly action: OfficeWorkflowAction;
  readonly projectId?: string;
  readonly rabVersionId?: string;
  readonly title?: string;
  readonly code?: string;
  readonly name?: string;
  readonly exportType?: "WORKING" | "OFFICIAL";
}

export interface OfficeWorkflowSuccessEnvelope<T> {
  readonly contractVersion: typeof OFFICE_WORKFLOW_CONTRACT_VERSION;
  readonly ok: true;
  readonly data: T;
}

export interface OfficeWorkflowErrorEnvelope {
  readonly contractVersion: typeof OFFICE_WORKFLOW_CONTRACT_VERSION;
  readonly ok: false;
  readonly error: { readonly code: string; readonly message: string; readonly details?: unknown };
}

export type OfficeWorkflowResponseEnvelope<T> = OfficeWorkflowSuccessEnvelope<T> | OfficeWorkflowErrorEnvelope;

export type ProjectPreviewForDelivery =
  | null
  | { readonly ok: true; readonly data: { readonly project: { readonly name: string; readonly code: string }; readonly state: "PREVIEW" } }
  | { readonly ok: false; readonly message: string };

export type DeliveryResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: { readonly code: string; readonly message: string } };

export function parseOfficeWorkflowGetRequest(search: URLSearchParams): OfficeWorkflowGetRequest {
  assertContractVersion(search.get("contractVersion"));
  if (search.get("operation") !== OFFICE_WORKFLOW_READ_OPERATION) {
    throw new ApplicationError("VALIDATION_ERROR", "workflow.read operation is required");
  }
  return {
    contractVersion: OFFICE_WORKFLOW_CONTRACT_VERSION,
    operation: OFFICE_WORKFLOW_READ_OPERATION,
    projectId: search.get("projectId"),
    rabVersionId: search.get("rabVersionId"),
  };
}

export function parseOfficeWorkflowPostRequest(input: unknown): OfficeWorkflowPostRequest {
  const record = inputRecord(input, "Workflow request must be an object");
  assertContractVersion(record.contractVersion);
  if (typeof record.action !== "string" || !isOfficeWorkflowAction(record.action)) {
    throw new ApplicationError("VALIDATION_ERROR", "Unknown workflow action");
  }
  return {
    contractVersion: OFFICE_WORKFLOW_CONTRACT_VERSION,
    action: record.action,
    ...(optionalText(record, "projectId")),
    ...(optionalText(record, "rabVersionId")),
    ...(optionalText(record, "title")),
    ...(optionalText(record, "code")),
    ...(optionalText(record, "name")),
    ...(optionalExportType(record)),
  };
}

export function officeWorkflowSuccess<T>(data: T): OfficeWorkflowSuccessEnvelope<T> {
  return { contractVersion: OFFICE_WORKFLOW_CONTRACT_VERSION, ok: true, data };
}

export function officeWorkflowError(error: { readonly code: string; readonly message: string; readonly details?: unknown }): OfficeWorkflowErrorEnvelope {
  return { contractVersion: OFFICE_WORKFLOW_CONTRACT_VERSION, ok: false, error };
}

export function createBrowserRequestContext(input: {
  readonly requestId: string;
  readonly projectId: string | null;
  readonly actorRole: BrowserActorRole;
}): RequestContext {
  return {
    requestId: input.requestId,
    projectId: input.projectId,
    actor: { actorId: "local-browser-operator", actorType: "HUMAN", actorRole: input.actorRole },
  };
}

export function previewProjectForDelivery(name: string, code: string): ProjectPreviewForDelivery {
  if (!name && !code) return null;
  try {
    const result = previewProjectCreation(
      createBrowserRequestContext({ requestId: "browser-project-preview", projectId: null, actorRole: "TECHNICAL" }),
      { name, code },
    );
    return { ok: true, data: { project: result.project, state: result.state } };
  } catch (error) {
    return { ok: false, message: error instanceof ApplicationError ? error.message : "Preview project tidak dapat dibuat." };
  }
}

export function toOfficeWorkflowReadModel(input: {
  readonly projects: readonly Project[];
  readonly activeProject: ActiveProjectContext | null;
  readonly rab: RabVersion | null;
}): OfficeWorkflowReadModel {
  const projects = input.projects.map(toProjectView);
  const activeProject = input.activeProject === null
    ? null
    : projects.find((project) => project.transport.projectId === input.activeProject?.projectId) ?? null;

  return {
    projects,
    activeProject,
    rab: input.rab === null ? null : toRabView(input.rab),
  };
}

export function createProjectDelivery(dependencies: { readonly createProject: CreateProjectUseCase }) {
  return Object.freeze({
    createProject: async (context: RequestContext, input: unknown): Promise<DeliveryResult<CreateProjectResponse>> => {
      try {
        return {
          ok: true,
          data: await dependencies.createProject.execute(context, {
            project: projectInput(input),
            initiation: { kind: "HUMAN_DIRECT" },
          }),
        };
      } catch (error) {
        return deliveryFailure(error);
      }
    },
  });
}

function toProjectView(project: Project): OfficeProjectView {
  return { transport: { projectId: project.projectId }, display: { code: project.code, name: project.name } };
}

function toRabView(rab: RabVersion): OfficeRabView {
  return {
    transport: { projectId: rab.projectId, rabVersionId: rab.rabVersionId },
    display: { title: rab.title, revisionNumber: rab.revisionNumber, lifecycle: rab.status },
    snapshot: {
      available: rab.calculationSnapshot !== null,
      calculatedAt: rab.calculationSnapshot?.calculatedAt.toISOString() ?? null,
    },
    calculation: rab.calculationSnapshot === null ? null : { totals: rab.calculationSnapshot.totals },
    validation: rab.validation === null ? null : {
      reviewBlocked: rab.validation.reviewBlocked,
      issues: rab.validation.issues.map((issue) => ({ severity: issue.severity, message: issue.message })),
    },
    approval: { confirmedWarningCount: rab.confirmedWarningCodes.length },
  };
}

function projectInput(input: unknown): { name: string; code: string } {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ApplicationError("VALIDATION_ERROR", "Project input is required");
  }
  const candidate = input as Record<string, unknown>;
  if (typeof candidate.name !== "string" || typeof candidate.code !== "string") {
    throw new ApplicationError("VALIDATION_ERROR", "Project name and code must be text");
  }
  return { name: candidate.name, code: candidate.code };
}

function assertContractVersion(value: unknown): void {
  if (value !== OFFICE_WORKFLOW_CONTRACT_VERSION) {
    throw new ApplicationError("VALIDATION_ERROR", `Unsupported workflow contract version: ${String(value ?? "missing")}`);
  }
}

function inputRecord(input: unknown, message: string): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ApplicationError("VALIDATION_ERROR", message);
  }
  return input as Record<string, unknown>;
}

function isOfficeWorkflowAction(value: string): value is OfficeWorkflowAction {
  return (OFFICE_WORKFLOW_ACTIONS as readonly string[]).includes(value);
}

function optionalText(input: Record<string, unknown>, key: string): Record<string, string> {
  return typeof input[key] === "string" ? { [key]: input[key] } : {};
}

function optionalExportType(input: Record<string, unknown>): { readonly exportType?: "WORKING" | "OFFICIAL" } {
  return input.exportType === "WORKING" || input.exportType === "OFFICIAL" ? { exportType: input.exportType } : {};
}

function deliveryFailure(error: unknown): DeliveryResult<never> {
  if (error instanceof ApplicationError) {
    return { ok: false, error: { code: error.code, message: error.message } };
  }
  return { ok: false, error: { code: "INTERNAL_ERROR", message: "Project operation failed" } };
}
