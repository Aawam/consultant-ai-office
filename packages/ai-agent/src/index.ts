import {
  ApplicationError,
  type RequestContext,
} from "@consultant-ai-office/application";
import type {
  ControlledToolContract,
  JsonSchema,
} from "@consultant-ai-office/shared-contracts";

export interface ControlledToolAdapter<Input = unknown, Output = unknown> {
  readonly definition: ControlledToolContract;
  execute(context: RequestContext, input: Input): Promise<Output>;
}

export interface ControlledToolRegistry {
  get(name: string): ControlledToolAdapter | undefined;
  list(): readonly ControlledToolContract[];
  invoke(
    name: string,
    context: RequestContext,
    input: unknown,
  ): Promise<unknown>;
}

function isSchema(schema: JsonSchema): boolean {
  return typeof schema === "object" && schema !== null && !Array.isArray(schema);
}

function validateDefinition(definition: ControlledToolContract): void {
  if (!/^[a-z][a-z0-9_]{1,63}$/.test(definition.name)) {
    throw new Error(`Invalid controlled tool name: "${definition.name}"`);
  }
  if (definition.description.trim().length === 0) {
    throw new Error(`Controlled tool "${definition.name}" requires a description`);
  }
  if (definition.permission.length === 0) {
    throw new Error(
      `Controlled tool "${definition.name}" requires a permission allowlist`,
    );
  }
  if (new Set(definition.permission).size !== definition.permission.length) {
    throw new Error(
      `Controlled tool "${definition.name}" has duplicate permissions`,
    );
  }
  if (!isSchema(definition.inputSchema) || !isSchema(definition.outputSchema)) {
    throw new Error(`Controlled tool "${definition.name}" requires object schemas`);
  }
  if (
    ["write", "finalize", "export"].includes(definition.mode) &&
    !definition.requiresApproval
  ) {
    throw new Error(
      `Controlled write tool "${definition.name}" must require approval`,
    );
  }
  if (
    definition.auditEvent.trim().length === 0 ||
    definition.idempotencyPolicy.trim().length === 0 ||
    definition.timeoutPolicy.trim().length === 0
  ) {
    throw new Error(
      `Controlled tool "${definition.name}" requires audit, idempotency, and timeout policies`,
    );
  }
}

function validateInput(name: string, schema: JsonSchema, input: unknown): void {
  if (schema.type !== "object") return;
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      `Controlled tool "${name}" requires an object input`,
    );
  }

  const required = Array.isArray(schema.required) ? schema.required : [];
  for (const field of required) {
    if (typeof field === "string" && !(field in input)) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        `Controlled tool "${name}" is missing required input`,
        { field },
      );
    }
  }
}

function snapshotTool(tool: ControlledToolAdapter): ControlledToolAdapter {
  const definition = Object.freeze({
    ...tool.definition,
    permission: Object.freeze([...tool.definition.permission]),
    inputSchema: Object.freeze({ ...tool.definition.inputSchema }),
    outputSchema: Object.freeze({ ...tool.definition.outputSchema }),
  });
  return Object.freeze({ definition, execute: tool.execute.bind(tool) });
}

export function createControlledToolRegistry(
  tools: readonly ControlledToolAdapter[],
): ControlledToolRegistry {
  const byName = new Map<string, ControlledToolAdapter>();

  for (const candidate of tools) {
    validateDefinition(candidate.definition);
    if (byName.has(candidate.definition.name)) {
      throw new Error(
        `Duplicate controlled tool name: "${candidate.definition.name}"`,
      );
    }
    byName.set(candidate.definition.name, snapshotTool(candidate));
  }

  return Object.freeze({
    get: (name: string) => byName.get(name),
    list: () => [...byName.values()].map((tool) => tool.definition),
    invoke: async (name: string, context: RequestContext, input: unknown) => {
      const tool = byName.get(name);
      if (!tool) {
        throw new ApplicationError("NOT_FOUND", "Controlled tool is not registered");
      }
      if (
        context.actor.actorType !== "AI_AGENT" ||
        !tool.definition.permission.includes(context.actor.actorRole)
      ) {
        throw new ApplicationError(
          "FORBIDDEN",
          "AI actor is not authorized for this controlled tool",
        );
      }
      validateInput(name, tool.definition.inputSchema, input);
      return tool.execute(context, input);
    },
  });
}

export { createProjectControlledTools } from "./project-tools";
