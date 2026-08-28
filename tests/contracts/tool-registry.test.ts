import { describe, expect, it } from "vitest";

import { createControlledToolRegistry } from "@consultant-ai-office/ai-agent";

describe("controlled AI tool registry", () => {
  it("rejects duplicate tool names so audit identity remains unambiguous", () => {
    const definition = {
      name: "get_project",
      description: "Read a project through an application use case",
      mode: "read" as const,
      permission: ["TECHNICAL" as const, "ADMIN" as const],
      inputSchema: {},
      outputSchema: {},
      requiresApproval: false,
      auditEvent: "project.read",
      idempotencyPolicy: "safe_retry",
      timeoutPolicy: "fail_closed",
    };

    expect(() =>
      createControlledToolRegistry([
        { definition, execute: async () => ({}) },
        { definition, execute: async () => ({}) },
      ]),
    ).toThrow('Duplicate controlled tool name: "get_project"');
  });
});
