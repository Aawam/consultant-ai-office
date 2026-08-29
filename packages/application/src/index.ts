export type { ActorIdentity, RequestContext } from "@consultant-ai-office/domain";
export type {
  ActorRole,
  ActorType,
  DocumentStatus,
  ValidationSeverity,
} from "@consultant-ai-office/shared-contracts";

export interface ApplicationUseCase<Request, Response> {
  execute(context: RequestContext, request: Request): Promise<Response>;
}
import type { RequestContext } from "@consultant-ai-office/domain";

export { ApplicationError, type ApplicationErrorCode } from "./errors";
export { RoleAuthorizationPolicy } from "./authorization";
export {
  assertWriteApproved,
  projectPreviewFingerprint,
  type HumanConfirmation,
  type WriteInitiation,
} from "./project-approval";
export {
  type ActiveProjectContextRepository,
  type AuditPort,
  type AuditRecordDraft,
  type ExecutionHistoryPort,
  type ExecutionRecordDraft,
  type ExecutionResult,
  type IdGeneratorPort,
  type ProjectMembershipRepository,
  type ProjectQueryPort,
  type ProjectRepository,
  type ProjectSelectionDependencies,
  type ProjectUnitOfWork,
  type ProjectWriteDependencies,
  type TransactionPort,
} from "./project-ports";
export {
  CreateProjectUseCase,
  cancelProjectCreation,
  previewProjectCreation,
  type CreateProjectRequest,
  type CreateProjectResponse,
} from "./project-create";
export {
  GetActiveProjectContextUseCase,
  ListAccessibleProjectsUseCase,
  SelectActiveProjectUseCase,
} from "./project-context";
