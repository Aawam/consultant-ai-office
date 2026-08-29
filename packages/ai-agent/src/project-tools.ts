import {
  ApplicationError,
  previewProjectCreation,
  type CreateProjectUseCase,
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
          required: ["project"],
        },
        outputSchema: { type: "object" },
        requiresApproval: true,
        auditEvent: "project.created",
        idempotencyPolicy: "reject_duplicate_request_id",
        timeoutPolicy: "fail_closed",
      },
      execute: (context, input, control) => {
        if (!control.humanConfirmation) {
          throw new ApplicationError(
            "APPROVAL_REQUIRED",
            "Controlled AI writes require out-of-band human confirmation",
          );
        }
        return dependencies.createProject.execute(context, {
          project: parseProject(record(input, "tool input").project),
          initiation: {
            kind: "AI_INITIATED",
            confirmation: control.humanConfirmation,
          },
        });
      },
    },
  ];
}
