import type { RequestContext } from "@consultant-ai-office/domain";

export type { RequestContext } from "@consultant-ai-office/domain";
export type {
  ActorRole,
  ActorType,
  DocumentStatus,
  ValidationSeverity,
} from "@consultant-ai-office/shared-contracts";

export interface ApplicationUseCase<Request, Response> {
  execute(context: RequestContext, request: Request): Promise<Response>;
}

export interface AuditRecordDraft {
  readonly eventName: string;
  readonly requestId: string;
  readonly projectId: string;
  readonly actorId: string;
  readonly occurredAt: Date;
  readonly sanitizedSummary: Readonly<Record<string, unknown>>;
}

export interface AuditPort {
  append(record: AuditRecordDraft): Promise<void>;
}
