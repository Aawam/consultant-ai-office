import type {
  ActorRole,
  ActorType,
  DocumentStatus,
} from "@consultant-ai-office/shared-contracts";

export interface ActorIdentity {
  readonly actorId: string;
  readonly actorType: ActorType;
  readonly actorRole: ActorRole;
}

export interface RequestContext {
  readonly requestId: string;
  readonly projectId: string | null;
  readonly actor: ActorIdentity;
}

export interface ClockPort {
  now(): Date;
}

export interface VersionState {
  readonly versionId: string;
  readonly status: DocumentStatus;
}

export {
  DomainValidationError,
  createProjectDraft,
  type ActiveProjectContext,
  type Project,
  type ProjectDraft,
  type ProjectDraftInput,
  type ProjectMembership,
} from "./project";
