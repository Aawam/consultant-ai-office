import {
  DomainValidationError,
  createProjectDraft,
  type ActiveProjectContext,
  type Project,
  type ProjectDraftInput,
  type RequestContext,
} from "@consultant-ai-office/domain";

import { RoleAuthorizationPolicy } from "./authorization";
import { ApplicationError } from "./errors";
import {
  assertWriteApproved,
  projectPreviewFingerprint,
  type WriteInitiation,
} from "./project-approval";
import type { ProjectWriteDependencies } from "./project-ports";

const PROJECT_ROLES = ["TECHNICAL", "ADMIN"] as const;

export interface CreateProjectRequest {
  readonly project: ProjectDraftInput;
  readonly initiation: WriteInitiation;
}

export interface CreateProjectResponse {
  readonly project: Project;
  readonly activeContext: ActiveProjectContext;
}

export function previewProjectCreation(
  context: RequestContext,
  input: ProjectDraftInput,
) {
  RoleAuthorizationPolicy.assertAllowed(
    context.actor,
    PROJECT_ROLES,
    "project.preview_create",
  );
  const project = createProjectDraft(input);

  return Object.freeze({
    project,
    previewFingerprint: projectPreviewFingerprint(project),
    state: "PREVIEW" as const,
  });
}

export function cancelProjectCreation(previewFingerprint: string) {
  if (previewFingerprint.length === 0) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "Preview fingerprint is required",
    );
  }

  return Object.freeze({ state: "CANCELLED" as const, previewFingerprint });
}

export class CreateProjectUseCase {
  constructor(private readonly dependencies: ProjectWriteDependencies) {}

  async execute(
    context: RequestContext,
    request: CreateProjectRequest,
  ): Promise<CreateProjectResponse> {
    RoleAuthorizationPolicy.assertAllowed(
      context.actor,
      PROJECT_ROLES,
      "project.create",
    );

    let draft;
    try {
      draft = createProjectDraft(request.project);
    } catch (error) {
      if (error instanceof DomainValidationError) {
        throw new ApplicationError("VALIDATION_ERROR", error.message, {
          issues: error.issues,
        });
      }
      throw error;
    }

    const approvalReference = assertWriteApproved(
      context,
      draft,
      request.initiation,
    );
    const occurredAt = this.dependencies.clock.now();
    const project: Project = {
      ...draft,
      projectId: this.dependencies.ids.next(),
      createdBy: context.actor.actorId,
      createdAt: occurredAt,
    };
    const activeContext: ActiveProjectContext = {
      actorId: context.actor.actorId,
      actorRole: context.actor.actorRole,
      projectId: project.projectId,
      selectedAt: occurredAt,
    };

    return this.dependencies.transaction.execute(async (unitOfWork) => {
      await unitOfWork.projects.create(project);
      await unitOfWork.memberships.grant({
        projectId: project.projectId,
        actorId: context.actor.actorId,
        actorRole: context.actor.actorRole,
        grantedAt: occurredAt,
      });
      await unitOfWork.activeContexts.set(activeContext);
      await unitOfWork.executions.append({
        executionId: this.dependencies.ids.next(),
        requestId: context.requestId,
        projectId: project.projectId,
        actorId: context.actor.actorId,
        actorType: context.actor.actorType,
        actorRole: context.actor.actorRole,
        action: "project.create",
        state: "SUCCEEDED",
        startedAt: occurredAt,
        completedAt: occurredAt,
        approvalReference,
        errorCode: null,
      });
      await unitOfWork.audit.append({
        auditId: this.dependencies.ids.next(),
        eventName: "action.succeeded",
        requestId: context.requestId,
        projectId: project.projectId,
        actorId: context.actor.actorId,
        actorType: context.actor.actorType,
        actorRole: context.actor.actorRole,
        action: "project.create",
        result: "SUCCEEDED",
        occurredAt,
        approvalReference,
        sanitizedSummary: { projectCode: project.code },
      });

      return { project, activeContext };
    });
  }
}
