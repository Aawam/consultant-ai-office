import { describe, expect, it } from "vitest";
import {
  OFFICE_WORKFLOW_CONTRACT_VERSION,
  OFFICE_WORKFLOW_READ_OPERATION,
  officeWorkflowError,
  officeWorkflowSuccess,
  parseOfficeWorkflowGetRequest,
  parseOfficeWorkflowPostRequest,
  toOfficeWorkflowReadModel,
} from "@consultant-ai-office/office-runtime";

describe("office runtime delivery contract", () => {
  it("uses versioned GET envelopes while separating transport IDs from display values", () => {
    const request = parseOfficeWorkflowGetRequest(new URLSearchParams({
      contractVersion: OFFICE_WORKFLOW_CONTRACT_VERSION,
      operation: OFFICE_WORKFLOW_READ_OPERATION,
      projectId: "project-internal-1",
      rabVersionId: "rab-internal-1",
    }));
    const readModel = toOfficeWorkflowReadModel({
      projects: [{ projectId: "project-internal-1", code: "BRU-01", name: "Kantor Camat", createdBy: "operator", createdAt: new Date("2026-08-31T00:00:00.000Z") }],
      activeProject: { actorId: "operator", actorRole: "TECHNICAL", projectId: "project-internal-1", selectedAt: new Date("2026-08-31T00:00:00.000Z") },
      rab: {
        rabVersionId: "rab-internal-1",
        projectId: "project-internal-1",
        revisionOfRabVersionId: null,
        revisionNumber: 1,
        title: "RAB REVIEW",
        status: "REVIEW",
        ohProfitRate: "0.10",
        ppnRate: "0.11",
        items: [],
        validation: { reviewBlocked: false, issues: [{ code: "DIRECT_VOLUME_REVIEW_REQUIRED", severity: "WARNING", path: "items[0]", message: "Reviewer confirmation is required" }] },
        calculationSnapshot: {
          calculatedAt: new Date("2026-08-31T00:00:00.000Z"),
          itemValues: { "item-internal-1": "100" },
          totals: { subtotalRab: "100", ppnValue: "11", totalBeforeRounding: "111", totalFinal: "111000", roundingDifference: "0" },
          exportSnapshot: { snapshotId: "snapshot-internal-1", bvLines: [], hspSnapshots: [], componentSnapshots: [], resourceSnapshots: [], sourceProvenance: {} },
        },
        confirmedWarningCodes: [],
        createdBy: "operator",
        createdAt: new Date("2026-08-31T00:00:00.000Z"),
        updatedAt: new Date("2026-08-31T00:00:00.000Z"),
      },
    });

    expect(request).toEqual({ contractVersion: "office-workflow-v1", operation: "workflow.read", projectId: "project-internal-1", rabVersionId: "rab-internal-1" });
    expect(readModel.activeProject).toEqual({ transport: { projectId: "project-internal-1" }, display: { code: "BRU-01", name: "Kantor Camat" } });
    expect(readModel.rab).toMatchObject({ display: { lifecycle: "REVIEW", revisionNumber: 1 }, calculation: { totals: { totalFinal: "111000" } }, validation: { reviewBlocked: false, issues: [{ severity: "WARNING", message: "Reviewer confirmation is required" }] }, snapshot: { available: true } });
    expect(readModel.rab?.transport).toEqual({ projectId: "project-internal-1", rabVersionId: "rab-internal-1" });
    expect(readModel.rab?.display).toEqual({ title: "RAB REVIEW", revisionNumber: 1, lifecycle: "REVIEW" });
    expect(readModel.rab?.snapshot).not.toHaveProperty("snapshotId");
    expect(readModel.rab).not.toHaveProperty("rabVersionId");
    expect(officeWorkflowSuccess(readModel)).toMatchObject({ contractVersion: "office-workflow-v1", ok: true, data: readModel });
    expect(readModel).not.toHaveProperty("contractVersion");
  });

  it("uses a versioned POST discriminator and preserves structured error codes", () => {
    expect(parseOfficeWorkflowPostRequest({
      contractVersion: OFFICE_WORKFLOW_CONTRACT_VERSION,
      action: "submit_review",
      projectId: "project-internal-1",
      rabVersionId: "rab-internal-1",
    })).toMatchObject({ contractVersion: "office-workflow-v1", action: "submit_review" });

    expect(officeWorkflowError({ code: "FORBIDDEN", message: "Actor is not allowed", details: { action: "finalize" } })).toEqual({
      contractVersion: "office-workflow-v1",
      ok: false,
      error: { code: "FORBIDDEN", message: "Actor is not allowed", details: { action: "finalize" } },
    });
  });
});
