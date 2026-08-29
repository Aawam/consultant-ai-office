import {
  ApplicationError,
  previewProjectCreation,
  type ActorIdentity,
  type CreateProjectRequest,
  type CreateProjectUseCase,
  type HumanConfirmation,
} from "@consultant-ai-office/application";

import type { ControlledToolAdapter } from "./index";

function record(input: unknown, field: string): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ApplicationError("VALIDATION_ERROR", `Invalid ${field}`);
  }
  return input as Record<string, unknown>;
}

function text(input: unknown, field: string): string {
  if (typeof input !== "string") {
    throw new ApplicationError("VALIDATION_ERROR", `Invalid ${field}`);
  }
  return input;
}

function parseProject(input: unknown): { name: string; code: string } {
  const project = record(input, "project");
  return {
    name: text(project.name, "project.name"),
    code: text(project.code, "project.code"),
  };
}

function parseHumanActor(input: unknown): ActorIdentity {
  const actor = record(input, "confirmation.confirmedBy");
  const actorType = text(actor.actorType, "confirmation.confirmedBy.actorType");
  const actorRole = text(actor.actorRole, "confirmation.confirmedBy.actorRole");
  if (
    actorType !== "HUMAN" ||
    (actorRole !== "TECHNICAL" && actorRole !== "ADMIN")
  ) {
    throw new ApplicationError("VALIDATION_ERROR", "Invalid human confirmer");
  }
  return {
    actorId: text(actor.actorId, "confirmation.confirmedBy.actorId"),
    actorType,
    actorRole,
  };
}

function parseConfirmation(input: unknown): HumanConfirmation {
  const confirmation = record(input, "confirmation");
  const confirmedAtText = text(
    confirmation.confirmedAt,
    "confirmation.confirmedAt",
  );
  const confirmedAt = new Date(confirmedAtText);
  if (Number.isNaN(confirmedAt.getTime())) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "Invalid confirmation.confirmedAt",
    );
  }
  return {
    confirmationId: text(
      confirmation.confirmationId,
      "confirmation.confirmationId",
    ),
    confirmedBy: parseHumanActor(confirmation.confirmedBy),
    previewFingerprint: text(
      confirmation.previewFingerprint,
      "confirmation.previewFingerprint",
    ),
    confirmedAt,
  };
}

function parseCreateRequest(input: unknown): CreateProjectRequest {
  const request = record(input, "tool input");
  const initiation = record(request.initiation, "initiation");
  if (initiation.kind !== "AI_INITIATED") {
    throw new ApplicationError(
      "APPROVAL_REQUIRED",
      "Controlled AI writes require AI initiation and human confirmation",
    );
  }
  return {
    project: parseProject(request.project),
    initiation: {
      kind: "AI_INITIATED",
      confirmation: parseConfirmation(initiation.confirmation),
    },
  };
}

export function createProjectControlledTools(dependencies: {
  readonly createProject: CreateProjectUseCase;
}): readonly ControlledToolAdapter[] {
  return [
    {
      definition: {
        name: "preview_project_creation",
        description: "Validate and preview project creation without persistence",
        mode: "calculate",
        permission: ["TECHNICAL", "ADMIN"],
        inputSchema: { type: "object", required: ["project"] },
        outputSchema: { type: "object" },
        requiresApproval: false,
        auditEvent: "project.creation.previewed",
        idempotencyPolicy: "safe_retry",
        timeoutPolicy: "fail_closed",
      },
      execute: async (context, input) => {
        const request = record(input, "tool input");
        return previewProjectCreation(context, parseProject(request.project));
      },
    },
    {
      definition: {
        name: "create_project",
        description: "Create a project through the shared application use case",
        mode: "write",
        permission: ["TECHNICAL", "ADMIN"],
        inputSchema: {
          type: "object",
          required: ["project", "initiation"],
        },
        outputSchema: { type: "object" },
        requiresApproval: true,
        auditEvent: "project.created",
        idempotencyPolicy: "reject_duplicate_request_id",
        timeoutPolicy: "fail_closed",
      },
      execute: (context, input) =>
        dependencies.createProject.execute(context, parseCreateRequest(input)),
    },
  ];
}
