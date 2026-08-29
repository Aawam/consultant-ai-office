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

  it("rejects a write tool that can bypass approval", () => {
    expect(() =>
      createControlledToolRegistry([
        {
          definition: {
            name: "create_project",
            description: "Create a project through the shared use case",
            mode: "write",
            permission: ["TECHNICAL"],
            inputSchema: {},
            outputSchema: {},
            requiresApproval: false,
            auditEvent: "project.created",
            idempotencyPolicy: "reject_duplicate_request_id",
            timeoutPolicy: "fail_closed",
          },
          execute: async () => ({}),
        },
      ]),
    ).toThrow('Controlled write tool "create_project" must require approval');
  });

  it("rejects invalid names and empty permission allowlists", () => {
    expect(() =>
      createControlledToolRegistry([
        {
          definition: {
            name: "Raw SQL",
            description: "Invalid unrestricted operation",
            mode: "read",
            permission: [],
            inputSchema: {},
            outputSchema: {},
            requiresApproval: false,
            auditEvent: "invalid",
            idempotencyPolicy: "none",
            timeoutPolicy: "none",
          },
          execute: async () => ({}),
        },
      ]),
    ).toThrow('Invalid controlled tool name: "Raw SQL"');
  });

  it("enforces the registered role allowlist before execution", async () => {
    let executions = 0;
    const registry = createControlledToolRegistry([
      {
        definition: {
          name: "technical_project_input",
          description: "Execute a technical project input use case",
          mode: "write",
          permission: ["TECHNICAL"],
          inputSchema: {},
          outputSchema: {},
          requiresApproval: true,
          auditEvent: "project.technical_input",
          idempotencyPolicy: "reject_duplicate_request_id",
          timeoutPolicy: "fail_closed",
        },
        execute: async () => {
          executions += 1;
          return {};
        },
      },
    ]);

    await expect(
      registry.invoke(
        "technical_project_input",
        {
          requestId: "tool-admin-forbidden",
          projectId: "project-1",
          actor: {
            actorId: "agent-admin",
            actorType: "AI_AGENT",
            actorRole: "ADMIN",
          },
        },
        {},
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(executions).toBe(0);
  });

  it("does not expose executable adapters outside registry enforcement", () => {
    const registry = createControlledToolRegistry([
      {
        definition: {
          name: "get_project",
          description: "Read a project through an application use case",
          mode: "read",
          permission: ["TECHNICAL"],
          inputSchema: {},
          outputSchema: {},
          requiresApproval: false,
          auditEvent: "project.read",
          idempotencyPolicy: "safe_retry",
          timeoutPolicy: "fail_closed",
        },
        execute: async () => ({}),
      },
    ]);

    expect(registry.get("get_project")).toEqual(
      expect.objectContaining({ name: "get_project", mode: "read" }),
    );
    expect(registry.get("get_project")).not.toHaveProperty("execute");
  });
});
