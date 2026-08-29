import type {
  ActiveProjectContext,
  ClockPort,
  Project,
  ProjectMembership,
} from "@consultant-ai-office/domain";
import type {
  ActorRole,
  ActorType,
} from "@consultant-ai-office/shared-contracts";

export type ExecutionResult = "SUCCEEDED" | "FAILED" | "CANCELLED";

export interface ProjectRepository {
  create(project: Project): Promise<void>;
}

export interface ProjectQueryPort {
  listAccessible(actorId: string): Promise<readonly Project[]>;
  hasAccess(actorId: string, projectId: string): Promise<boolean>;
  getActive(actorId: string): Promise<ActiveProjectContext | null>;
}

export interface ProjectMembershipRepository {
  grant(membership: ProjectMembership): Promise<void>;
}

export interface ActiveProjectContextRepository {
  set(context: ActiveProjectContext): Promise<void>;
}

export interface AuditRecordDraft {
  readonly auditId: string;
  readonly eventName: string;
  readonly requestId: string;
  readonly projectId: string;
  readonly actorId: string;
  readonly actorType: ActorType;
  readonly actorRole: ActorRole;
  readonly action: string;
  readonly result: ExecutionResult;
  readonly occurredAt: Date;
  readonly approvalReference: string | null;
  readonly sanitizedSummary: Readonly<Record<string, unknown>>;
}

export interface AuditPort {
  append(record: AuditRecordDraft): Promise<void>;
}

export interface ExecutionRecordDraft {
  readonly executionId: string;
  readonly requestId: string;
  readonly projectId: string;
  readonly actorId: string;
  readonly actorType: ActorType;
  readonly actorRole: ActorRole;
  readonly action: string;
  readonly state: ExecutionResult;
  readonly startedAt: Date;
  readonly completedAt: Date;
  readonly approvalReference: string | null;
  readonly errorCode: string | null;
}

export interface ExecutionHistoryPort {
  append(record: ExecutionRecordDraft): Promise<void>;
}

export interface ProjectHistoryQueryPort {
  listExecutions(
    projectId: string,
    limit: number,
  ): Promise<readonly ExecutionRecordDraft[]>;
  listAuditEvents(
    projectId: string,
    limit: number,
  ): Promise<readonly AuditRecordDraft[]>;
}

export interface ProjectHistoryDependencies {
  readonly projects: ProjectQueryPort;
  readonly history: ProjectHistoryQueryPort;
}

export interface ProjectUnitOfWork {
  readonly projects: ProjectRepository;
  readonly memberships: ProjectMembershipRepository;
  readonly activeContexts: ActiveProjectContextRepository;
  readonly executions: ExecutionHistoryPort;
  readonly audit: AuditPort;
}

export interface TransactionPort {
  execute<T>(operation: (unitOfWork: ProjectUnitOfWork) => Promise<T>): Promise<T>;
}

export interface IdGeneratorPort {
  next(): string;
}

export interface ProjectWriteDependencies {
  readonly transaction: TransactionPort;
  readonly clock: ClockPort;
  readonly ids: IdGeneratorPort;
}

export interface ProjectSelectionDependencies extends ProjectWriteDependencies {
  readonly queries: ProjectQueryPort;
}
