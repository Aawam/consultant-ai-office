import type { RequestContext } from "@consultant-ai-office/domain";

import { RoleAuthorizationPolicy } from "./authorization";
import { ApplicationError } from "./errors";
import type {
  AuditRecordDraft,
  ExecutionRecordDraft,
  ProjectHistoryDependencies,
} from "./project-ports";

const PROJECT_ROLES = ["TECHNICAL", "ADMIN"] as const;

export interface GetActiveProjectHistoryRequest {
  readonly limit: number;
}

export interface GetActiveProjectHistoryResponse {
  readonly projectId: string;
  readonly executions: readonly ExecutionRecordDraft[];
  readonly auditEvents: readonly AuditRecordDraft[];
}

export class GetActiveProjectHistoryUseCase {
  constructor(private readonly dependencies: ProjectHistoryDependencies) {}

  async execute(
    context: RequestContext,
    request: GetActiveProjectHistoryRequest,
  ): Promise<GetActiveProjectHistoryResponse> {
    RoleAuthorizationPolicy.assertAllowed(
      context.actor,
      PROJECT_ROLES,
      "project.history.read",
    );

    if (context.projectId === null) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Active project context is required",
      );
    }
    if (!Number.isInteger(request.limit) || request.limit < 1 || request.limit > 100) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "History limit must be an integer between 1 and 100",
      );
    }
    if (
      !(await this.dependencies.projects.hasAccess(
        context.actor.actorId,
        context.projectId,
      ))
    ) {
      throw new ApplicationError(
        "FORBIDDEN",
        "Actor cannot access the active project history",
      );
    }

    const [executions, auditEvents] = await Promise.all([
      this.dependencies.history.listExecutions(context.projectId, request.limit),
      this.dependencies.history.listAuditEvents(context.projectId, request.limit),
    ]);

    return {
      projectId: context.projectId,
      executions,
      auditEvents,
    };
  }
}
