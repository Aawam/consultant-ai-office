import type {
  ActiveProjectContext,
  Project,
  RequestContext,
} from "@consultant-ai-office/domain";

import { RoleAuthorizationPolicy } from "./authorization";
import { ApplicationError } from "./errors";
import type {
  ProjectQueryPort,
  ProjectSelectionDependencies,
} from "./project-ports";

const PROJECT_ROLES = ["TECHNICAL", "ADMIN"] as const;

export class ListAccessibleProjectsUseCase {
  constructor(private readonly queries: ProjectQueryPort) {}

  async execute(
    context: RequestContext,
    request: Readonly<Record<string, never>>,
  ): Promise<readonly Project[]> {
    void request;
    RoleAuthorizationPolicy.assertAllowed(context.actor, PROJECT_ROLES, "project.list");
    return this.queries.listAccessible(context.actor.actorId);
  }
}

export class GetActiveProjectContextUseCase {
  constructor(private readonly queries: ProjectQueryPort) {}

  async execute(
    context: RequestContext,
    request: Readonly<Record<string, never>>,
  ): Promise<ActiveProjectContext | null> {
    void request;
    RoleAuthorizationPolicy.assertAllowed(
      context.actor,
      PROJECT_ROLES,
      "project.get_active_context",
    );
    return this.queries.getActive(context.actor.actorId);
  }
}

export class SelectActiveProjectUseCase {
  constructor(private readonly dependencies: ProjectSelectionDependencies) {}

  async execute(
    context: RequestContext,
    request: { readonly projectId: string },
  ): Promise<ActiveProjectContext> {
    RoleAuthorizationPolicy.assertAllowed(
      context.actor,
      PROJECT_ROLES,
      "project.select",
    );

    if (
      !(await this.dependencies.queries.hasAccess(
        context.actor.actorId,
        request.projectId,
      ))
    ) {
      throw new ApplicationError(
        "FORBIDDEN",
        "Actor cannot access the requested project",
      );
    }

    const occurredAt = this.dependencies.clock.now();
    const activeContext: ActiveProjectContext = {
      actorId: context.actor.actorId,
      actorRole: context.actor.actorRole,
      projectId: request.projectId,
      selectedAt: occurredAt,
    };

    return this.dependencies.transaction.execute(async (unitOfWork) => {
      await unitOfWork.activeContexts.set(activeContext);
      await unitOfWork.executions.append({
        executionId: this.dependencies.ids.next(),
        requestId: context.requestId,
        projectId: request.projectId,
        actorId: context.actor.actorId,
        actorType: context.actor.actorType,
        actorRole: context.actor.actorRole,
        action: "project.select",
        state: "SUCCEEDED",
        startedAt: occurredAt,
        completedAt: occurredAt,
        approvalReference: null,
        errorCode: null,
      });
      await unitOfWork.audit.append({
        auditId: this.dependencies.ids.next(),
        eventName: "action.succeeded",
        requestId: context.requestId,
        projectId: request.projectId,
        actorId: context.actor.actorId,
        actorType: context.actor.actorType,
        actorRole: context.actor.actorRole,
        action: "project.select",
        result: "SUCCEEDED",
        occurredAt,
        approvalReference: null,
        sanitizedSummary: {},
      });
      return activeContext;
    });
  }
}
