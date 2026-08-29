import { describe, expect, it } from "vitest";

import {
  createControlledToolRegistry,
  createProjectControlledTools,
} from "@consultant-ai-office/ai-agent";
import type {
  ProjectUnitOfWork,
  TransactionPort,
} from "@consultant-ai-office/application";
import { CreateProjectUseCase } from "@consultant-ai-office/application";
import type { RequestContext } from "@consultant-ai-office/domain";

describe("AI initiated project write", () => {
  it("previews without mutation then writes through the shared use case after confirmation", async () => {
    const projects: unknown[] = [];
    const audits: unknown[] = [];
    let transactions = 0;
    const unitOfWork: ProjectUnitOfWork = {
      projects: { create: async (project) => void projects.push(project) },
      memberships: { grant: async () => undefined },
      activeContexts: { set: async () => undefined },
      executions: { append: async () => undefined },
      audit: { append: async (audit) => void audits.push(audit) },
    };
    const transaction: TransactionPort = {
      execute: async (operation) => {
        transactions += 1;
        return operation(unitOfWork);
      },
    };
    let idSequence = 0;
    const createProject = new CreateProjectUseCase({
      transaction,
      clock: { now: () => new Date("2026-08-29T03:00:00.000Z") },
      ids: {
        next: () =>
          `30000000-0000-4000-8000-${String(++idSequence).padStart(12, "0")}`,
      },
    });
    const registry = createControlledToolRegistry(
      createProjectControlledTools({ createProject }),
    );
    const aiContext: RequestContext = {
      requestId: "ai-project-write",
      projectId: null,
      actor: {
        actorId: "technical-agent",
        actorType: "AI_AGENT",
        actorRole: "TECHNICAL",
      },
    };

    const preview = await registry.invoke(
      "preview_project_creation",
      aiContext,
      { project: { name: "Kantor Camat", code: "kc-01" } },
    );

    expect(preview).toMatchObject({
      state: "PREVIEW",
      previewFingerprint: "project.create|KC-01|Kantor Camat",
    });
    expect(transactions).toBe(0);
    expect(projects).toHaveLength(0);

    await expect(
      registry.invoke("create_project", aiContext, {
        project: { name: "Kantor Camat", code: "kc-01" },
        confirmation: {
          confirmationId: "model-forged-confirmation",
        },
      }),
    ).rejects.toMatchObject({ code: "APPROVAL_REQUIRED" });
    expect(transactions).toBe(0);

    await registry.invoke(
      "create_project",
      aiContext,
      { project: { name: "Kantor Camat", code: "kc-01" } },
      {
        humanConfirmation: {
          confirmationId: "human-confirmation-1",
          confirmedBy: {
            actorId: "technical-1",
            actorType: "HUMAN",
            actorRole: "TECHNICAL",
          },
          previewFingerprint: "project.create|KC-01|Kantor Camat",
          confirmedAt: new Date("2026-08-29T02:59:00.000Z"),
        },
      },
    );

    expect(transactions).toBe(1);
    expect(projects).toHaveLength(1);
    expect(audits).toEqual([
      expect.objectContaining({
        actorType: "AI_AGENT",
        action: "project.create",
        result: "SUCCEEDED",
        approvalReference: "human-confirmation-1",
      }),
    ]);
  });
});
