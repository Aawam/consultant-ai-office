import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  ApplicationError,
  CreateProjectUseCase,
  GetActiveProjectContextUseCase,
  ListAccessibleProjectsUseCase,
  SelectActiveProjectUseCase,
  type CreateProjectResponse,
} from "@consultant-ai-office/application";
import type { RequestContext } from "@consultant-ai-office/domain";
import { createPostgresProjectFoundation } from "@consultant-ai-office/infrastructure";
import { createProjectDelivery } from "../../apps/office-web/app/project-delivery";

const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "TEST_DATABASE_URL is required for PostgreSQL integration tests; tests are not skipped",
  );
}

const technicalContext: RequestContext = {
  requestId: "p0-db-technical-create",
  projectId: null,
  actor: {
    actorId: "p0-technical",
    actorType: "HUMAN",
    actorRole: "TECHNICAL",
  },
};

const adminContext: RequestContext = {
  requestId: "p0-db-admin-create",
  projectId: null,
  actor: {
    actorId: "p0-admin",
    actorType: "HUMAN",
    actorRole: "ADMIN",
  },
};

describe("PostgreSQL project foundation vertical slice", () => {
  const pool = new Pool({ connectionString });
  const runtime = createPostgresProjectFoundation({ pool });
  let idSequence = 0;
  const dependencies = {
    transaction: runtime.transaction,
    queries: runtime.queries,
    clock: { now: () => new Date("2026-08-29T02:00:00.000Z") },
    ids: {
      next: () =>
        `10000000-0000-4000-8000-${String(++idSequence).padStart(12, "0")}`,
    },
  };
  let projectA: CreateProjectResponse;
  let projectB: CreateProjectResponse;

  beforeAll(async () => {
    await pool.query(
      "TRUNCATE office.audit_events, office.tool_executions, office.active_project_contexts, office.project_memberships, office.projects CASCADE",
    );
    const createProject = new CreateProjectUseCase(dependencies);
    const delivery = createProjectDelivery({ createProject });
    const deliveredProjectA = await delivery.createProject(technicalContext, {
      name: "Project A",
      code: "P0-A",
    });
    if (!deliveredProjectA.ok) {
      throw new Error(`Delivery setup failed: ${deliveredProjectA.error.code}`);
    }
    projectA = deliveredProjectA.data;
    projectB = await createProject.execute(adminContext, {
      project: { name: "Project B", code: "P0-B" },
      initiation: { kind: "HUMAN_DIRECT" },
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  it("flows Delivery -> Application -> Domain -> PostgreSQL -> Audit", async () => {
    const stored = await pool.query<{
      code: string;
      actor_id: string;
      action: string;
      project_id: string;
      result: string;
    }>(
      `select p.code, a.actor_id, a.action, a.project_id, a.result
         from office.projects p
         join office.audit_events a on a.project_id = p.project_id
        where p.project_id = $1`,
      [projectA.project.projectId],
    );

    expect(stored.rows).toEqual([
      {
        code: "P0-A",
        actor_id: "p0-technical",
        action: "project.create",
        project_id: projectA.project.projectId,
        result: "SUCCEEDED",
      },
    ]);
  });

  it("keeps Project A context isolated from Project B", async () => {
    const listProjects = new ListAccessibleProjectsUseCase(runtime.queries);
    const getActiveContext = new GetActiveProjectContextUseCase(runtime.queries);

    await expect(listProjects.execute(technicalContext, {})).resolves.toEqual([
      expect.objectContaining({ code: "P0-A" }),
    ]);
    await expect(listProjects.execute(adminContext, {})).resolves.toEqual([
      expect.objectContaining({ code: "P0-B" }),
    ]);
    await expect(
      getActiveContext.execute(technicalContext, {}),
    ).resolves.toMatchObject({ projectId: projectA.project.projectId });
    await expect(getActiveContext.execute(adminContext, {})).resolves.toMatchObject({
      projectId: projectB.project.projectId,
    });
  });

  it("forbids inaccessible selection without any database mutation", async () => {
    const listProjects = new ListAccessibleProjectsUseCase(runtime.queries);
    const selectProject = new SelectActiveProjectUseCase(dependencies);
    const getActiveContext = new GetActiveProjectContextUseCase(runtime.queries);
    const [projectB] = await listProjects.execute(adminContext, {});
    if (!projectB) throw new Error("Project B fixture was not created");
    const beforeContext = await getActiveContext.execute(technicalContext, {});
    const beforeCounts = await pool.query<{ audit: string; executions: string }>(
      `select
         (select count(*) from office.audit_events)::text as audit,
         (select count(*) from office.tool_executions)::text as executions`,
    );

    await expect(
      selectProject.execute(
        { ...technicalContext, requestId: "p0-db-forbidden-select" },
        { projectId: projectB.projectId },
      ),
    ).rejects.toMatchObject<ApplicationError>({ code: "FORBIDDEN" });

    await expect(
      getActiveContext.execute(technicalContext, {}),
    ).resolves.toEqual(beforeContext);
    await expect(
      pool.query<{ audit: string; executions: string }>(
        `select
           (select count(*) from office.audit_events)::text as audit,
           (select count(*) from office.tool_executions)::text as executions`,
      ),
    ).resolves.toMatchObject({ rows: beforeCounts.rows });
  });

  it("rolls back every partial row when a transaction fails", async () => {
    const projectId = "20000000-0000-4000-8000-000000000001";

    await expect(
      runtime.transaction.execute(async (unitOfWork) => {
        await unitOfWork.projects.create({
          projectId,
          name: "Atomic Failure",
          code: "P0-ROLLBACK",
          createdBy: technicalContext.actor.actorId,
          createdAt: new Date("2026-08-29T02:00:00.000Z"),
        });
        await unitOfWork.memberships.grant({
          projectId,
          actorId: technicalContext.actor.actorId,
          actorRole: technicalContext.actor.actorRole,
          grantedAt: new Date("2026-08-29T02:00:00.000Z"),
        });
        throw new Error("forced transaction failure");
      }),
    ).rejects.toThrow("forced transaction failure");

    const rows = await pool.query<{ project_count: string; member_count: string }>(
      `select
         (select count(*) from office.projects where project_id = $1)::text as project_count,
         (select count(*) from office.project_memberships where project_id = $1)::text as member_count`,
      [projectId],
    );
    expect(rows.rows).toEqual([{ project_count: "0", member_count: "0" }]);
  });

  it("maps duplicate persistence failures without leaving partial writes", async () => {
    const createProject = new CreateProjectUseCase(dependencies);
    const before = await pool.query<{
      projects: string;
      memberships: string;
      executions: string;
      audits: string;
    }>(
      `select
         (select count(*) from office.projects)::text as projects,
         (select count(*) from office.project_memberships)::text as memberships,
         (select count(*) from office.tool_executions)::text as executions,
         (select count(*) from office.audit_events)::text as audits`,
    );

    await expect(
      createProject.execute(
        {
          ...technicalContext,
          requestId: "p0-db-duplicate",
          actor: { ...technicalContext.actor, actorId: "p0-other-technical" },
        },
        {
          project: { name: "Duplicate Code", code: "P0-A" },
          initiation: { kind: "HUMAN_DIRECT" },
        },
      ),
    ).rejects.toMatchObject<ApplicationError>({ code: "CONFLICT" });

    await expect(
      pool.query<{
        projects: string;
        memberships: string;
        executions: string;
        audits: string;
      }>(
        `select
           (select count(*) from office.projects)::text as projects,
           (select count(*) from office.project_memberships)::text as memberships,
           (select count(*) from office.tool_executions)::text as executions,
           (select count(*) from office.audit_events)::text as audits`,
      ),
    ).resolves.toMatchObject({ rows: before.rows });
  });
});
