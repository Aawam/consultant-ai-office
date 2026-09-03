import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

async function source(relativePath: string) {
  return readFile(join(root, relativePath), "utf8");
}

describe("Phase 1A route/view contract", () => {
  it("maps Home through the contextual project and RAB routes", async () => {
    const [home, projects, detail, rab] = await Promise.all([
      source("apps/office-web/app/page.tsx"),
      source("apps/office-web/app/projects/page.tsx"),
      source("apps/office-web/app/projects/[projectId]/page.tsx"),
      source("apps/office-web/app/projects/[projectId]/rab/[[...view]]/page.tsx"),
    ]);

    expect(home).toContain("OfficeWorkspace");
    expect(projects).toContain('routeView="projects"');
    expect(detail).toContain('routeView="project"');
    expect(detail).toContain("initialProjectId={projectId}");
    expect(rab).toContain('[undefined, "rab"]');
    expect(rab).toContain('["edit", "edit"]');
    expect(rab).toContain('["export", "export"]');
    expect(rab).toContain("notFound()");
  });

  it("keeps technical IDs in transport/navigation while displaying project labels", async () => {
    const workspace = await source("apps/office-web/app/office-workspace.tsx");
    const detail = await source("apps/office-web/app/projects/[projectId]/page.tsx");

    expect(detail).toContain("initialProjectId={projectId}");
    expect(workspace).toContain("project.display.code");
    expect(workspace).toContain("project.display.name");
    expect(workspace).not.toContain("Project ID:");
    expect(workspace).not.toContain("RAB ID:");
  });

  it("keeps lifecycle, revision, and snapshot as compact display-only read context", async () => {
    const workspace = await source("apps/office-web/app/office-workspace.tsx");

    expect(workspace).toContain('rab.display.lifecycle');
    expect(workspace).toContain('rab.display.revisionNumber');
    expect(workspace).toContain('rab.snapshot.available');
    expect(workspace).toContain('"DRAFT"');
    expect(workspace).toContain('"REVIEW"');
    expect(workspace).toContain('"FINAL"');
    expect(workspace).not.toContain('"APPROVED"');
    expect(workspace).not.toContain("onStatus(status");
  });

  it("makes edit and export route shells non-executable", async () => {
    const [rab, workspace] = await Promise.all([
      source("apps/office-web/app/projects/[projectId]/rab/[[...view]]/page.tsx"),
      source("apps/office-web/app/office-workspace.tsx"),
    ]);

    expect(rab).not.toContain('method: "POST"');
    expect(rab).not.toContain("fetch(");
    expect(workspace).toContain('workspace === "edit"');
    expect(workspace).toContain("readOnly");
    expect(workspace).toContain('workspace === "export"');
    expect(workspace).toContain("Official Export unavailable in Phase 1A");
  });

  it("renders loading, empty, validation, error, and blocked states from read data", async () => {
    const workspace = await source("apps/office-web/app/office-workspace.tsx");

    expect(workspace).toContain("Loading saved workflow state");
    expect(workspace).toContain("EmptyState");
    expect(workspace).toContain("ValidationPanel");
    expect(workspace).toContain('notice.tone === "error" ? "alert" : "status"');
    expect(workspace).toContain('tone: "blocked"');
    expect(workspace).toContain("!response.ok || !result.ok");
  });
});
