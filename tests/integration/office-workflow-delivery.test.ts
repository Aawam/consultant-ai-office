import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET, POST } from "../../apps/office-web/app/api/workflow/route";
import { createOfficeRuntime } from "@consultant-ai-office/office-runtime";

const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) throw new Error("TEST_DATABASE_URL is required for browser delivery tests");

async function post(body: Record<string, string>, role: "TECHNICAL" | "ADMIN" = "TECHNICAL") {
  return POST(new Request("http://localhost/api/workflow", { method: "POST", headers: { "content-type": "application/json", "x-office-role": role }, body: JSON.stringify(body) }));
}

async function json<T>(response: Response): Promise<T> { return response.json() as Promise<T>; }

describe("browser workflow delivery boundary", () => {
  const runtime = createOfficeRuntime({ connectionString, maxConnections: 2 });

  beforeAll(async () => {
    await runtime.pool.query("TRUNCATE office.export_artifacts, office.audit_events, office.tool_executions, office.rab_versions, office.active_project_contexts, office.project_memberships, office.projects CASCADE");
  });
  afterAll(() => runtime.close());

  it("persists DRAFT → REVIEW → FINAL → revision across delivery reloads", async () => {
    const projectResponse = await post({ action: "create_project", code: "DELIVERY-01", name: "Delivery E2E" });
    expect(projectResponse.status).toBe(201);
    const project = await json<{ ok: true; data: { project: { projectId: string }; activeContext: { projectId: string } } }>(projectResponse);
    const projectId = project.data.project.projectId;

    const draftResponse = await post({ action: "create_draft", projectId });
    expect(draftResponse.status).toBe(201);
    const draft = await json<{ ok: true; data: { rabVersionId: string; status: string } }>(draftResponse);
    expect(draft.data.status).toBe("DRAFT");

    const reviewResponse = await post({ action: "submit_review", projectId, rabVersionId: draft.data.rabVersionId });
    expect(reviewResponse.status).toBe(200);
    expect((await json<{ data: { status: string; validation: { reviewBlocked: boolean } } }>(reviewResponse)).data).toMatchObject({ status: "REVIEW", validation: { reviewBlocked: false } });

    const reviewReload = await GET(new Request(`http://localhost/api/workflow?projectId=${projectId}&rabVersionId=${draft.data.rabVersionId}`, { headers: { "x-office-role": "TECHNICAL" } }));
    expect((await json<{ data: { rab: { status: string } } }>(reviewReload)).data.rab.status).toBe("REVIEW");

    const technicalFinalize = await post({ action: "finalize", projectId, rabVersionId: draft.data.rabVersionId }, "TECHNICAL");
    expect(technicalFinalize.status).toBe(403);

    const finalResponse = await post({ action: "finalize", projectId, rabVersionId: draft.data.rabVersionId }, "ADMIN");
    expect(finalResponse.status).toBe(200);
    expect((await json<{ data: { status: string; confirmedWarningCodes: string[] } }>(finalResponse)).data).toMatchObject({ status: "FINAL", confirmedWarningCodes: ["DIRECT_VOLUME_REVIEW_REQUIRED", "MANUAL_HSP_REVIEW_REQUIRED"] });

    const finalReload = await GET(new Request(`http://localhost/api/workflow?projectId=${projectId}&rabVersionId=${draft.data.rabVersionId}`, { headers: { "x-office-role": "ADMIN" } }));
    expect((await json<{ data: { rab: { status: string } } }>(finalReload)).data.rab.status).toBe("FINAL");

    const revisionResponse = await post({ action: "create_revision", projectId, rabVersionId: draft.data.rabVersionId }, "ADMIN");
    expect(revisionResponse.status).toBe(200);
    const revision = await json<{ data: { rabVersionId: string; status: string; revisionNumber: number; revisionOfRabVersionId: string } }>(revisionResponse);
    expect(revision.data).toMatchObject({ status: "DRAFT", revisionNumber: 2, revisionOfRabVersionId: draft.data.rabVersionId });

    const revisionReload = await GET(new Request(`http://localhost/api/workflow?projectId=${projectId}&rabVersionId=${revision.data.rabVersionId}`, { headers: { "x-office-role": "TECHNICAL" } }));
    expect((await json<{ data: { rab: { status: string; revisionNumber: number } } }>(revisionReload)).data.rab).toMatchObject({ status: "DRAFT", revisionNumber: 2 });
  });

  it("does not report false REVIEW success for an invalid delivery request", async () => {
    const response = await post({ action: "create_draft" });
    expect(response.status).toBe(422);
    expect(await json<{ ok: false; error: { code: string } }>(response)).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
  });

  it("returns a working export from the persisted RAB calculation snapshot", async () => {
    const projectResponse = await post({ action: "create_project", code: "DELIVERY-EXP", name: "Delivery Export" });
    const project = await json<{ data: { project: { projectId: string } } }>(projectResponse);
    const projectId = project.data.project.projectId;
    const draftResponse = await post({ action: "create_draft", projectId, title: "Export draft" });
    const draft = await json<{ data: { rabVersionId: string } }>(draftResponse);
    const reviewResponse = await post({ action: "submit_review", projectId, rabVersionId: draft.data.rabVersionId });
    expect(reviewResponse.status).toBe(200);
    const review = await json<{ data: { status: string; calculationSnapshot: { exportSnapshot: { snapshotId: string } } } }>(reviewResponse);
    expect(review.data.status).toBe("REVIEW");

    const response = await post({ action: "export_excel", projectId, rabVersionId: draft.data.rabVersionId, exportType: "WORKING" });
    const result = await json<{ ok: boolean; data?: { artifact: { exportType: string; rabVersionId: string; snapshotId: string }; bytesBase64: string }; error?: { code: string; message: string } }>(response);
    if (!result.ok) throw new Error(`Working export failed: ${result.error?.code ?? "unknown"}: ${result.error?.message ?? "unknown"}`);
    expect(response.status).toBe(200);
    expect(result.data).toMatchObject({ artifact: { exportType: "WORKING", rabVersionId: draft.data.rabVersionId, snapshotId: review.data.calculationSnapshot.exportSnapshot.snapshotId }, bytesBase64: expect.any(String) });
  });
});
