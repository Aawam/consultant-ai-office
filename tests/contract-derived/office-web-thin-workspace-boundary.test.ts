import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

async function source(relativePath: string) {
  return readFile(join(root, relativePath), "utf8");
}

describe("Phase 1A thin workspace delivery boundary", () => {
  it("offers an executable WORKING export only", async () => {
    const workspace = await source("apps/office-web/app/office-workspace.tsx");

    expect(workspace).toContain('exportType: "WORKING"');
    expect(workspace).not.toContain('requestExport("OFFICIAL")');
    expect(workspace).toContain("Official Export unavailable in Phase 1A");
  });

  it("uses the versioned v1 workflow consumer contract", async () => {
    const workspace = await source("apps/office-web/app/office-workspace.tsx");

    expect(workspace).toContain('query.set("contractVersion", workflowContractVersion)');
    expect(workspace).toContain('query.set("operation", "workflow.read")');
    expect(workspace).toContain('contractVersion: workflowContractVersion, action');
    expect(workspace).toContain("parseWorkflowEnvelope");
  });

  it("does not render raw technical identifiers or local lifecycle transitions", async () => {
    const workspace = await source("apps/office-web/app/office-workspace.tsx");

    expect(workspace).not.toContain("Project ID:");
    expect(workspace).not.toContain("RAB ID:");
    expect(workspace).not.toContain("Calculation snapshot unavailable");
    expect(workspace).not.toContain("onStatus(status");
  });

  it("keeps Application imports outside office-web delivery modules", async () => {
    const [page, projectDelivery, route] = await Promise.all([
      source("apps/office-web/app/page.tsx"),
      source("apps/office-web/app/project-delivery.ts"),
      source("apps/office-web/app/api/workflow/route.ts"),
    ]);

    for (const moduleSource of [page, projectDelivery, route]) {
      expect(moduleSource).not.toContain("@consultant-ai-office/application");
    }
  });
});
