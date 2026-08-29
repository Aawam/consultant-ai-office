import {
  ApplicationError,
  type CreateProjectResponse,
  type CreateProjectUseCase,
  type RequestContext,
} from "@consultant-ai-office/application";
import type { OfficeRuntime } from "@consultant-ai-office/office-runtime";

export type DeliveryResult<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly error: { readonly code: string; readonly message: string };
    };

function projectInput(input: unknown): { name: string; code: string } {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ApplicationError("VALIDATION_ERROR", "Project input is required");
  }
  const candidate = input as Record<string, unknown>;
  if (typeof candidate.name !== "string" || typeof candidate.code !== "string") {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "Project name and code must be text",
    );
  }
  return { name: candidate.name, code: candidate.code };
}

function deliveryFailure(error: unknown): DeliveryResult<never> {
  if (error instanceof ApplicationError) {
    return { ok: false, error: { code: error.code, message: error.message } };
  }
  return {
    ok: false,
    error: { code: "INTERNAL_ERROR", message: "Project operation failed" },
  };
}

export function createProjectDelivery(dependencies: {
  readonly createProject: CreateProjectUseCase;
}) {
  return Object.freeze({
    createProject: async (
      context: RequestContext,
      input: unknown,
    ): Promise<DeliveryResult<CreateProjectResponse>> => {
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

export function createProjectDeliveryFromRuntime(runtime: Pick<OfficeRuntime, "projects">) {
  return createProjectDelivery({ createProject: runtime.projects.create });
}
