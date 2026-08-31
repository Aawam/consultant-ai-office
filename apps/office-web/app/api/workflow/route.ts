import { NextResponse } from "next/server";
import {
  createBrowserRequestContext,
  createOfficeRuntimeFromEnv,
  officeWorkflowError,
  officeWorkflowSuccess,
  parseOfficeWorkflowGetRequest,
  parseOfficeWorkflowPostRequest,
  toOfficeWorkflowReadModel,
  type OfficeRuntime,
} from "@consultant-ai-office/office-runtime";

export const runtime = "nodejs";

let runtimeInstance: OfficeRuntime | undefined;

function runtimeForRequest(): OfficeRuntime {
  return (runtimeInstance ??= createOfficeRuntimeFromEnv());
}

function context(request: Request, projectId: string | null, requestId: string) {
  const actorRole = request.headers.get("x-office-role") === "ADMIN" ? "ADMIN" : "TECHNICAL";
  return createBrowserRequestContext({ requestId, projectId, actorRole });
}

function errorResponse(error: unknown) {
  const candidate = error as { code?: string; message?: string; details?: unknown };
  const status = candidate.code === "FORBIDDEN" ? 403 : candidate.code === "NOT_FOUND" ? 404 : 422;
  return NextResponse.json(officeWorkflowError({ code: candidate.code ?? "INTERNAL_ERROR", message: candidate.message ?? "Workflow operation failed", ...(candidate.details === undefined ? {} : { details: candidate.details }) }), { status });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const workflowRequest = parseOfficeWorkflowGetRequest(url.searchParams);
    const runtime = runtimeForRequest();
    const requestContext = context(request, workflowRequest.projectId, "browser-workflow-load");
    const [projects, activeProject, rab] = await Promise.all([
      runtime.projects.list.execute(requestContext, {}),
      runtime.projects.getActive.execute(requestContext, {}),
      workflowRequest.rabVersionId ? runtime.rab.get(workflowRequest.rabVersionId) : Promise.resolve(null),
    ]);
    return NextResponse.json(officeWorkflowSuccess(toOfficeWorkflowReadModel({ projects, activeProject, rab })));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = parseOfficeWorkflowPostRequest(await request.json());
    const runtime = runtimeForRequest();
    if (body.action === "create_project") {
      const result = await runtime.projects.create.execute(context(request, null, "browser-project-create"), { project: { name: body.name ?? body.title ?? "", code: body.code ?? "" }, initiation: { kind: "HUMAN_DIRECT" } });
      return NextResponse.json(officeWorkflowSuccess(result), { status: 201 });
    }
    if (!body.projectId) return NextResponse.json(officeWorkflowError({ code: "VALIDATION_ERROR", message: "projectId is required" }), { status: 422 });
    if (body.action === "select_project") {
      const selected = await runtime.projects.select.execute(context(request, null, "browser-project-select"), { projectId: body.projectId });
      return NextResponse.json(officeWorkflowSuccess(selected));
    }
    if (body.action === "create_draft") {
      const draft = await runtime.rab.createDraft.execute(context(request, body.projectId, "browser-rab-create"), {
        title: body.title ?? "RAB DRAFT",
        ohProfitRate: "0.10",
        ppnRate: "0.11",
        items: [{ itemId: "browser-item-1", description: "Manual browser item", volume: "2", volumeUnitRaw: "m2", volumeSource: { kind: "DIRECT", quantityKind: "SIMPLE", basis: "jumlah unit", source: "browser input", note: "minimum valid traceability", reviewerId: "local-browser-admin" }, hsp: { kind: "MANUAL_NON_AHSP", unitRaw: "m2", manualHsp: "100", note: "browser source" } }],
      });
      return NextResponse.json(officeWorkflowSuccess(draft), { status: 201 });
    }
    if (!body.rabVersionId) return NextResponse.json(officeWorkflowError({ code: "VALIDATION_ERROR", message: "rabVersionId is required" }), { status: 422 });
    if (body.action === "export_excel") {
      const result = await runtime.rab.exportExcel.execute(context(request, body.projectId, "browser-rab-export"), { rabVersionId: body.rabVersionId, exportType: body.exportType ?? "WORKING" });
      return NextResponse.json(officeWorkflowSuccess({ artifact: result.artifact, bytesBase64: Buffer.from(result.bytes).toString("base64") }));
    }
    if (body.action === "submit_review") return NextResponse.json(officeWorkflowSuccess(await runtime.rab.submitReview.execute(context(request, body.projectId, "browser-rab-review"), { rabVersionId: body.rabVersionId })));
    if (body.action === "finalize") return NextResponse.json(officeWorkflowSuccess(await runtime.rab.finalize.execute(context(request, body.projectId, "browser-rab-finalize"), { rabVersionId: body.rabVersionId, confirmedWarningCodes: ["DIRECT_VOLUME_REVIEW_REQUIRED", "MANUAL_HSP_REVIEW_REQUIRED"] })));
    if (body.action === "create_revision") return NextResponse.json(officeWorkflowSuccess(await runtime.rab.createRevision.execute(context(request, body.projectId, "browser-rab-revision"), { rabVersionId: body.rabVersionId })));
    return NextResponse.json(officeWorkflowError({ code: "VALIDATION_ERROR", message: "Unknown workflow action" }), { status: 422 });
  } catch (error) {
    return errorResponse(error);
  }
}
