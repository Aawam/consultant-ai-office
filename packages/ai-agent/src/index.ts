import type { RequestContext } from "@consultant-ai-office/application";
import type { ControlledToolContract } from "@consultant-ai-office/shared-contracts";

export interface ControlledToolAdapter<Input = unknown, Output = unknown> {
  readonly definition: ControlledToolContract;
  execute(context: RequestContext, input: Input): Promise<Output>;
}

export interface ControlledToolRegistry {
  get(name: string): ControlledToolAdapter | undefined;
  list(): readonly ControlledToolContract[];
}

export function createControlledToolRegistry(
  tools: readonly ControlledToolAdapter[],
): ControlledToolRegistry {
  const byName = new Map<string, ControlledToolAdapter>();

  for (const tool of tools) {
    if (byName.has(tool.definition.name)) {
      throw new Error(`Duplicate controlled tool name: "${tool.definition.name}"`);
    }
    byName.set(tool.definition.name, tool);
  }

  return Object.freeze({
    get: (name: string) => byName.get(name),
    list: () => [...byName.values()].map((tool) => tool.definition),
  });
}
