export const DOCUMENT_STATUSES = ["DRAFT", "REVIEW", "FINAL"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const ACTOR_TYPES = ["HUMAN", "AI_AGENT", "SYSTEM"] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

export const ACTOR_ROLES = ["TECHNICAL", "ADMIN"] as const;
export type ActorRole = (typeof ACTOR_ROLES)[number];

export const VALIDATION_SEVERITIES = ["ERROR", "WARNING", "INFO"] as const;
export type ValidationSeverity = (typeof VALIDATION_SEVERITIES)[number];

export const TOOL_MODES = [
  "read",
  "calculate",
  "write",
  "finalize",
  "export",
] as const;
export type ToolMode = (typeof TOOL_MODES)[number];

export type JsonSchema = Readonly<Record<string, unknown>>;

export interface ControlledToolContract {
  readonly name: string;
  readonly description: string;
  readonly mode: ToolMode;
  readonly permission: readonly ActorRole[];
  readonly inputSchema: JsonSchema;
  readonly outputSchema: JsonSchema;
  readonly requiresApproval: boolean;
  readonly auditEvent: string;
  readonly idempotencyPolicy: string;
  readonly timeoutPolicy: string;
}

export interface AICompletionRequest {
  readonly requestId: string;
  readonly prompt: string;
}

export type AICompletionResult =
  | { readonly state: "COMPLETED"; readonly output: string }
  | { readonly state: "DISABLED"; readonly output: null };

export interface AIProviderPort {
  isEnabled(): boolean;
  complete(request: AICompletionRequest): Promise<AICompletionResult>;
}
