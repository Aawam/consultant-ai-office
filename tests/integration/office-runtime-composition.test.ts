import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestContext } from "@consultant-ai-office/domain";
import { createOfficeRuntime } from "@consultant-ai-office/office-runtime";
import { createProjectDeliveryFromRuntime } from "../../apps/office-web/app/project-delivery";

const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) throw new Error("TEST_DATABASE_URL is required for office runtime composition tests");

describe("office runtime composition", () => {
  const runtime = createOfficeRuntime({ connectionString, maxConnections: 2 });
  const context: RequestContext = {
    requestId: "office-runtime-composition",
    projectId: null,
    actor: { actorId: "runtime-technical", actorType: "HUMAN", actorRole: "TECHNICAL" },
  };

  beforeAll(async () => {
    await runtime.pool.query("TRUNCATE office.audit_events, office.tool_executions, office.rab_versions, office.active_project_contexts, office.project_memberships, office.projects CASCADE");
  });
  afterAll(() => runtime.close());

  it("assembles infrastructure once and persists through office-web delivery to Application", async () => {
    const delivery = createProjectDeliveryFromRuntime(runtime);
    const result = await delivery.createProject(context, { code: "RUNTIME-01", name: "Runtime Composition" });
    expect(result).toMatchObject({ ok: true, data: { project: { code: "RUNTIME-01" }, activeContext: { actorId: "runtime-technical" } } });
    const stored = await runtime.pool.query("select p.code, a.action from office.projects p join office.audit_events a on a.project_id = p.project_id where p.code = 'RUNTIME-01'");
    expect(stored.rows).toEqual([{ code: "RUNTIME-01", action: "project.create" }]);
  });

  it("runs RAB lifecycle through the same composed runtime and reloads FINAL state", async () => {
    const delivery = createProjectDeliveryFromRuntime(runtime);
    const projectResult = await delivery.createProject({ ...context, requestId: "runtime-rab-project" }, { code: "RUNTIME-RAB", name: "Runtime RAB" });
    if (!projectResult.ok) throw new Error(projectResult.error.message);
    const projectContext = { ...context, requestId: "runtime-rab-create", projectId: projectResult.data.project.projectId };
    const rab = await runtime.rab.createDraft.execute(projectContext, {
      title: "Runtime RAB draft",
      ohProfitRate: "0.10",
      ppnRate: "0.11",
      items: [{
        itemId: "runtime-item-1",
        description: "Manual runtime item",
        volume: "2",
        volumeUnitRaw: "m2",
        volumeSource: { kind: "DIRECT", quantityKind: "SIMPLE", basis: "jumlah", source: "gambar", note: "runtime", reviewerId: "runtime-admin" },
        hsp: { kind: "MANUAL_NON_AHSP", unitRaw: "m2", manualHsp: "100", note: "runtime source" },
      }],
    });
    const reviewed = await runtime.rab.submitReview.execute(projectContext, { rabVersionId: rab.rabVersionId });
    expect(reviewed.status).toBe("REVIEW");
    await expect(runtime.rab.finalize.execute({ ...projectContext, actor: { ...projectContext.actor, actorId: "runtime-admin", actorRole: "ADMIN" } }, { rabVersionId: rab.rabVersionId, confirmedWarningCodes: ["DIRECT_VOLUME_REVIEW_REQUIRED", "MANUAL_HSP_REVIEW_REQUIRED"] })).resolves.toMatchObject({ status: "FINAL" });
    await expect(runtime.rab.createRevision.execute(projectContext, { rabVersionId: rab.rabVersionId })).resolves.toMatchObject({ status: "DRAFT", revisionNumber: 2 });
    await expect(runtime.rab.submitReview.execute({ ...projectContext, actor: { ...projectContext.actor, actorId: "runtime-admin", actorRole: "ADMIN" } }, { rabVersionId: rab.rabVersionId })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(await runtime.rab.submitReview).toBeDefined();
    expect(await runtime.pool.query("select status from office.rab_versions where rab_version_id = $1", [rab.rabVersionId])).toMatchObject({ rows: [{ status: "FINAL" }] });
  });
});
