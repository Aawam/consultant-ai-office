import { describe, expect, it } from "vitest";

import {
  ApplicationError,
  CreateProjectUseCase,
  GetActiveProjectHistoryUseCase,
  RoleAuthorizationPolicy,
  cancelProjectCreation,
  previewProjectCreation,
  type ProjectUnitOfWork,
  type TransactionPort,
} from "@consultant-ai-office/application";
import {
  DomainValidationError,
  createProjectDraft,
  type RequestContext,
} from "@consultant-ai-office/domain";

const technicalContext: RequestContext = {
  requestId: "request-1",
  projectId: null,
  actor: {
    actorId: "technical-1",
    actorType: "HUMAN",
    actorRole: "TECHNICAL",
  },
};

function createMemoryTransaction() {
  const projects: unknown[] = [];
  const memberships: unknown[] = [];
  const contexts: unknown[] = [];
  const executions: unknown[] = [];
  const audits: unknown[] = [];
  let transactions = 0;

  const unitOfWork: ProjectUnitOfWork = {
    projects: { create: async (project) => void projects.push(project) },
    memberships: {
      grant: async (membership) => void memberships.push(membership),
    },
    activeContexts: {
      set: async (context) => void contexts.push(context),
    },
    executions: {
      append: async (execution) => void executions.push(execution),
    },
    audit: { append: async (event) => void audits.push(event) },
  };

  const transaction: TransactionPort = {
    execute: async (operation) => {
      transactions += 1;
      return operation(unitOfWork);
    },
  };

  return {
    transaction,
    counts: () => ({
      projects: projects.length,
      memberships: memberships.length,
      contexts: contexts.length,
      executions: executions.length,
      audits: audits.length,
      transactions,
    }),
    audits,
  };
}

describe("project domain", () => {
  it("normalizes a valid project draft", () => {
    expect(
      createProjectDraft({ name: "  Kantor Camat  ", code: " kc-01 " }),
    ).toEqual({ name: "Kantor Camat", code: "KC-01" });
  });

  it("rejects invalid project input before persistence", () => {
    expect(() => createProjectDraft({ name: "x", code: "invalid code" })).toThrow(
      DomainValidationError,
    );
  });
});

describe("role authorization foundation", () => {
  it("permits an allowlisted role", () => {
    expect(() =>
      RoleAuthorizationPolicy.assertAllowed(
        technicalContext.actor,
        ["TECHNICAL"],
        "project.technical_input",
      ),
    ).not.toThrow();
  });

  it("forbids a role outside the operation allowlist", () => {
    expect(() =>
      RoleAuthorizationPolicy.assertAllowed(
        { ...technicalContext.actor, actorRole: "ADMIN" },
        ["TECHNICAL"],
        "project.technical_input",
      ),
    ).toThrowError(
      expect.objectContaining<ApplicationError>({ code: "FORBIDDEN" }),
    );
  });
});

describe("project write semantics", () => {
  it("keeps preview and cancel mutation-free", () => {
    const memory = createMemoryTransaction();
    const preview = previewProjectCreation(technicalContext, {
      name: "Kantor Camat",
      code: "KC-01",
    });

    expect(preview.previewFingerprint).toBe(
      "project.create|KC-01|Kantor Camat",
    );
    expect(cancelProjectCreation(technicalContext, preview.previewFingerprint)).toEqual({
      state: "CANCELLED",
      previewFingerprint: preview.previewFingerprint,
    });
    expect(memory.counts()).toEqual({
      projects: 0,
      memberships: 0,
      contexts: 0,
      executions: 0,
      audits: 0,
      transactions: 0,
    });
  });

  it("rejects AI initiated writes without matching human confirmation", async () => {
    const memory = createMemoryTransaction();
    const useCase = new CreateProjectUseCase({
      transaction: memory.transaction,
      clock: { now: () => new Date("2026-08-29T01:00:00.000Z") },
      ids: { next: () => "00000000-0000-4000-8000-000000000001" },
    });
    const aiContext: RequestContext = {
      ...technicalContext,
      actor: { ...technicalContext.actor, actorType: "AI_AGENT" },
    };

    await expect(
      useCase.execute(aiContext, {
        project: { name: "Kantor Camat", code: "KC-01" },
        initiation: {
          kind: "AI_INITIATED",
          confirmation: {
            confirmationId: "confirmation-1",
            confirmedBy: technicalContext.actor,
            previewFingerprint: "project.create|WRONG|Kantor Camat",
            confirmedAt: new Date("2026-08-29T00:59:00.000Z"),
          },
        },
      }),
    ).rejects.toMatchObject({ code: "APPROVAL_MISMATCH" });

    expect(memory.counts()).toEqual({
      projects: 0,
      memberships: 0,
      contexts: 0,
      executions: 0,
      audits: 0,
      transactions: 0,
    });
  });

  it("prevents an AI actor from claiming the human-direct write path", async () => {
    const memory = createMemoryTransaction();
    const useCase = new CreateProjectUseCase({
      transaction: memory.transaction,
      clock: { now: () => new Date("2026-08-29T01:00:00.000Z") },
      ids: { next: () => "00000000-0000-4000-8000-000000000001" },
    });

    await expect(
      useCase.execute(
        {
          ...technicalContext,
          actor: { ...technicalContext.actor, actorType: "AI_AGENT" },
        },
        {
          project: { name: "Kantor Camat", code: "KC-01" },
          initiation: { kind: "HUMAN_DIRECT" },
        },
      ),
    ).rejects.toMatchObject({ code: "APPROVAL_REQUIRED" });
    expect(memory.counts().transactions).toBe(0);
  });

  it("creates project, membership, context, execution, and audit atomically", async () => {
    const memory = createMemoryTransaction();
    let idSequence = 0;
    const useCase = new CreateProjectUseCase({
      transaction: memory.transaction,
      clock: { now: () => new Date("2026-08-29T01:00:00.000Z") },
      ids: {
        next: () =>
          `00000000-0000-4000-8000-${String(++idSequence).padStart(12, "0")}`,
      },
    });

    const result = await useCase.execute(technicalContext, {
      project: { name: "Kantor Camat", code: "kc-01" },
      initiation: { kind: "HUMAN_DIRECT" },
    });

    expect(result.project).toMatchObject({
      name: "Kantor Camat",
      code: "KC-01",
      createdBy: "technical-1",
    });
    expect(result.activeContext.projectId).toBe(result.project.projectId);
    expect(memory.counts()).toEqual({
      projects: 1,
      memberships: 1,
      contexts: 1,
      executions: 1,
      audits: 1,
      transactions: 1,
    });
    expect(memory.audits).toEqual([
      expect.objectContaining({
        actorId: "technical-1",
        actorRole: "TECHNICAL",
        action: "project.create",
        projectId: result.project.projectId,
        result: "SUCCEEDED",
      }),
    ]);
  });

  it("does not open a transaction when domain validation fails", async () => {
    const memory = createMemoryTransaction();
    const useCase = new CreateProjectUseCase({
      transaction: memory.transaction,
      clock: { now: () => new Date("2026-08-29T01:00:00.000Z") },
      ids: { next: () => "00000000-0000-4000-8000-000000000001" },
    });

    await expect(
      useCase.execute(technicalContext, {
        project: { name: "x", code: "bad code" },
        initiation: { kind: "HUMAN_DIRECT" },
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    expect(memory.counts().transactions).toBe(0);
  });
});

describe("project history boundary", () => {
  it("returns only history for the active, accessible project", async () => {
    const history = new GetActiveProjectHistoryUseCase({
      projects: {
        listAccessible: async () => [],
        hasAccess: async (actorId, projectId) =>
          actorId === "technical-1" && projectId === "project-a",
        getActive: async () => null,
      },
      history: {
        listExecutions: async (projectId) => [
          {
            executionId: "execution-a",
            requestId: "request-a",
            projectId,
            actorId: "technical-1",
            actorType: "HUMAN",
            actorRole: "TECHNICAL",
            action: "project.create",
            state: "SUCCEEDED",
            startedAt: new Date("2026-08-29T01:00:00.000Z"),
            completedAt: new Date("2026-08-29T01:00:00.000Z"),
            approvalReference: null,
            errorCode: null,
          },
        ],
        listAuditEvents: async (projectId) => [
          {
            auditId: "audit-a",
            eventName: "action.succeeded",
            requestId: "request-a",
            projectId,
            actorId: "technical-1",
            actorType: "HUMAN",
            actorRole: "TECHNICAL",
            action: "project.create",
            result: "SUCCEEDED",
            occurredAt: new Date("2026-08-29T01:00:00.000Z"),
            approvalReference: null,
            sanitizedSummary: {},
          },
        ],
      },
    });

    const result = await history.execute(
      { ...technicalContext, projectId: "project-a" },
      { limit: 20 },
    );

    expect(result.projectId).toBe("project-a");
    expect(result.executions).toHaveLength(1);
    expect(result.auditEvents).toHaveLength(1);
    expect(result.executions[0]?.projectId).toBe("project-a");
    expect(result.auditEvents[0]?.projectId).toBe("project-a");
  });

  it("does not query history when active project membership is missing", async () => {
    let historyQueries = 0;
    const history = new GetActiveProjectHistoryUseCase({
      projects: {
        listAccessible: async () => [],
        hasAccess: async () => false,
        getActive: async () => null,
      },
      history: {
        listExecutions: async () => {
          historyQueries += 1;
          return [];
        },
        listAuditEvents: async () => {
          historyQueries += 1;
          return [];
        },
      },
    });

    await expect(
      history.execute(
        { ...technicalContext, projectId: "project-b" },
        { limit: 20 },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(historyQueries).toBe(0);
  });
});
