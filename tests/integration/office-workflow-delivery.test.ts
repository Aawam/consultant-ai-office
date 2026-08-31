import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET, POST } from "../../apps/office-web/app/api/workflow/route";
import {
  OFFICE_WORKFLOW_CONTRACT_VERSION,
  OFFICE_WORKFLOW_READ_OPERATION,
  createOfficeRuntime,
} from "@consultant-ai-office/office-runtime";

const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) throw new Error("TEST_DATABASE_URL is required for browser delivery tests");

async function post(body: Record<string, string>, role: "TECHNICAL" | "ADMIN" = "TECHNICAL") {
  return POST(new Request("http://localhost/api/workflow", { method: "POST", headers: { "content-type": "application/json", "x-office-role": role }, body: JSON.stringify({ contractVersion: OFFICE_WORKFLOW_CONTRACT_VERSION, ...body }) }));
}

async function json<T>(response: Response): Promise<T> { return response.json() as Promise<T>; }

function workflowUrl(projectId: string, rabVersionId: string): string {
  const query = new URLSearchParams({ contractVersion: OFFICE_WORKFLOW_CONTRACT_VERSION, operation: OFFICE_WORKFLOW_READ_OPERATION, projectId, rabVersionId });
  return `http://localhost/api/workflow?${query.toString()}`;
}

describe("browser workflow delivery boundary", () => {
  const runtime = createOfficeRuntime({ connectionString, maxConnections: 2 });

  beforeAll(async () => {
    await runtime.pool.query("TRUNCATE office.export_artifacts, office.audit_events, office.tool_executions, office.rab_versions, office.active_project_contexts, office.project_memberships, office.projects CASCADE");
  });
  afterAll(() => runtime.close());

  it("persists DRAFT → REVIEW → FINAL → revision across delivery reloads", async () => {
    const projectResponse = await post({ action: "create_project", code: "DELIVERY-01", name: "Delivery E2E" });
    expect(projectResponse.status).toBe(201);
    const project = await json<{ contractVersion: string; ok: true; data: { project: { projectId: string }; activeContext: { projectId: string } } }>(projectResponse);
    expect(project.contractVersion).toBe(OFFICE_WORKFLOW_CONTRACT_VERSION);
    const projectId = project.data.project.projectId;

    const draftResponse = await post({ action: "create_draft", projectId });
    expect(draftResponse.status).toBe(201);
    const draft = await json<{ contractVersion: string; ok: true; data: { rabVersionId: string; status: string } }>(draftResponse);
    expect(draft.contractVersion).toBe(OFFICE_WORKFLOW_CONTRACT_VERSION);
    expect(draft.data.status).toBe("DRAFT");

    const reviewResponse = await post({ action: "submit_review", projectId, rabVersionId: draft.data.rabVersionId });
    expect(reviewResponse.status).toBe(200);
    const review = await json<{ contractVersion: string; data: { status: string; validation: { reviewBlocked: boolean } } }>(reviewResponse);
    expect(review.contractVersion).toBe(OFFICE_WORKFLOW_CONTRACT_VERSION);
    expect(review.data).toMatchObject({ status: "REVIEW", validation: { reviewBlocked: false } });

    const reviewReload = await GET(new Request(workflowUrl(projectId, draft.data.rabVersionId), { headers: { "x-office-role": "TECHNICAL" } }));
    const reviewedReadModel = await json<{ contractVersion: string; data: { rab: { display: { lifecycle: string }; transport: { rabVersionId: string } } } }>(reviewReload);
    expect(reviewedReadModel.contractVersion).toBe(OFFICE_WORKFLOW_CONTRACT_VERSION);
    expect(reviewedReadModel.data.rab).toMatchObject({ display: { lifecycle: "REVIEW" }, transport: { rabVersionId: draft.data.rabVersionId } });

    const technicalFinalize = await post({ action: "finalize", projectId, rabVersionId: draft.data.rabVersionId }, "TECHNICAL");
    expect(technicalFinalize.status).toBe(403);

    const finalResponse = await post({ action: "finalize", projectId, rabVersionId: draft.data.rabVersionId }, "ADMIN");
    expect(finalResponse.status).toBe(200);
    const finalized = await json<{ contractVersion: string; data: { status: string; confirmedWarningCodes: string[] } }>(finalResponse);
    expect(finalized.contractVersion).toBe(OFFICE_WORKFLOW_CONTRACT_VERSION);
    expect(finalized.data).toMatchObject({ status: "FINAL", confirmedWarningCodes: ["DIRECT_VOLUME_REVIEW_REQUIRED", "MANUAL_HSP_REVIEW_REQUIRED"] });

    const finalReload = await GET(new Request(workflowUrl(projectId, draft.data.rabVersionId), { headers: { "x-office-role": "ADMIN" } }));
    expect((await json<{ contractVersion: string; data: { rab: { display: { lifecycle: string } } } }>(finalReload))).toMatchObject({ contractVersion: OFFICE_WORKFLOW_CONTRACT_VERSION, data: { rab: { display: { lifecycle: "FINAL" } } } });

    const revisionResponse = await post({ action: "create_revision", projectId, rabVersionId: draft.data.rabVersionId }, "ADMIN");
    expect(revisionResponse.status).toBe(200);
    const revision = await json<{ contractVersion: string; data: { rabVersionId: string; status: string; revisionNumber: number; revisionOfRabVersionId: string } }>(revisionResponse);
    expect(revision.contractVersion).toBe(OFFICE_WORKFLOW_CONTRACT_VERSION);
    expect(revision.data).toMatchObject({ status: "DRAFT", revisionNumber: 2, revisionOfRabVersionId: draft.data.rabVersionId });

    const revisionReload = await GET(new Request(workflowUrl(projectId, revision.data.rabVersionId), { headers: { "x-office-role": "TECHNICAL" } }));
    expect((await json<{ contractVersion: string; data: { rab: { display: { lifecycle: string; revisionNumber: number } } } }>(revisionReload))).toMatchObject({ contractVersion: OFFICE_WORKFLOW_CONTRACT_VERSION, data: { rab: { display: { lifecycle: "DRAFT", revisionNumber: 2 } } } });
  });

  it("does not report false REVIEW success for an invalid delivery request", async () => {
    const response = await post({ action: "create_draft" });
    expect(response.status).toBe(422);
    expect(await json<{ contractVersion: string; ok: false; error: { code: string } }>(response)).toMatchObject({ contractVersion: OFFICE_WORKFLOW_CONTRACT_VERSION, ok: false, error: { code: "VALIDATION_ERROR" } });
  });

  it("returns a working export from the persisted RAB calculation snapshot", async () => {
    const projectResponse = await post({ action: "create_project", code: "DELIVERY-EXP", name: "Delivery Export" });
    const project = await json<{ contractVersion: string; data: { project: { projectId: string } } }>(projectResponse);
    expect(project.contractVersion).toBe(OFFICE_WORKFLOW_CONTRACT_VERSION);
    const projectId = project.data.project.projectId;
    const draftResponse = await post({ action: "create_draft", projectId, title: "Export draft" });
    const draft = await json<{ contractVersion: string; data: { rabVersionId: string } }>(draftResponse);
    expect(draft.contractVersion).toBe(OFFICE_WORKFLOW_CONTRACT_VERSION);
    const reviewResponse = await post({ action: "submit_review", projectId, rabVersionId: draft.data.rabVersionId });
    expect(reviewResponse.status).toBe(200);
    const review = await json<{ contractVersion: string; data: { status: string; calculationSnapshot: { exportSnapshot: { snapshotId: string } } } }>(reviewResponse);
    expect(review.contractVersion).toBe(OFFICE_WORKFLOW_CONTRACT_VERSION);
    expect(review.data.status).toBe("REVIEW");

    const response = await post({ action: "export_excel", projectId, rabVersionId: draft.data.rabVersionId, exportType: "WORKING" });
    const result = await json<{ contractVersion: string; ok: boolean; data?: { artifact: { exportType: string; rabVersionId: string; snapshotId: string }; bytesBase64: string }; error?: { code: string; message: string } }>(response);
    if (!result.ok) throw new Error(`Working export failed: ${result.error?.code ?? "unknown"}: ${result.error?.message ?? "unknown"}`);
    expect(response.status).toBe(200);
    expect(result.contractVersion).toBe(OFFICE_WORKFLOW_CONTRACT_VERSION);
    expect(result.data).toMatchObject({ artifact: { exportType: "WORKING", rabVersionId: draft.data.rabVersionId, snapshotId: review.data.calculationSnapshot.exportSnapshot.snapshotId }, bytesBase64: expect.any(String) });
  });
});
