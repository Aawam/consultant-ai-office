import { and, asc, desc, eq } from "drizzle-orm";
import { drizzle, type NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type { Pool } from "pg";

import {
  ApplicationError,
  type ApplicationErrorCode,
  type AuditRecordDraft,
  type ExecutionRecordDraft,
  type ProjectHistoryQueryPort,
  type ProjectQueryPort,
  type ProjectUnitOfWork,
  type TransactionPort,
} from "@consultant-ai-office/application";

import {
  activeProjectContexts,
  auditEvents,
  postgresSchema,
  projectMemberships,
  projects,
  toolExecutions,
} from "./schema";

type OfficeExecutor = PgDatabase<NodePgQueryResultHKT, typeof postgresSchema>;

function postgresErrorCode(error: unknown): string | null {
  let current = error;
  for (let depth = 0; depth < 4; depth += 1) {
    if (typeof current !== "object" || current === null) return null;
    if ("code" in current && typeof current.code === "string") {
      return current.code;
    }
    current = "cause" in current ? current.cause : null;
  }
  return null;
}

function mapPostgresError(error: unknown): never {
  const code = postgresErrorCode(error);
  if (code === "23505") {
    throw new ApplicationError("CONFLICT", "Project code already exists");
  }

  if (code !== null) {
    const applicationCode: ApplicationErrorCode = "TRANSACTION_FAILED";
    throw new ApplicationError(applicationCode, "Database transaction failed");
  }

  throw error;
}

function createUnitOfWork(executor: OfficeExecutor): ProjectUnitOfWork {
  return {
    projects: {
      create: async (project) => {
        await executor.insert(projects).values(project);
      },
    },
    memberships: {
      grant: async (membership) => {
        await executor.insert(projectMemberships).values(membership);
      },
    },
    activeContexts: {
      set: async (context) => {
        await executor
          .insert(activeProjectContexts)
          .values(context)
          .onConflictDoUpdate({
            target: activeProjectContexts.actorId,
            set: {
              actorRole: context.actorRole,
              projectId: context.projectId,
              selectedAt: context.selectedAt,
            },
          });
      },
    },
    executions: {
      append: async (execution) => {
        await executor.insert(toolExecutions).values(execution);
      },
    },
    audit: {
      append: async (event) => {
        await executor.insert(auditEvents).values(event);
      },
    },
  };
}

export function createPostgresProjectFoundation(options: { readonly pool: Pool }) {
  const database = drizzle(options.pool, { schema: postgresSchema });

  const transaction: TransactionPort = {
    execute: async (operation) => {
      try {
        return await database.transaction((postgresTransaction) =>
          operation(createUnitOfWork(postgresTransaction)),
        );
      } catch (error) {
        return mapPostgresError(error);
      }
    },
  };

  const queries: ProjectQueryPort = {
    listAccessible: async (actorId) =>
      database
        .select({
          projectId: projects.projectId,
          code: projects.code,
          name: projects.name,
          createdBy: projects.createdBy,
          createdAt: projects.createdAt,
        })
        .from(projects)
        .innerJoin(
          projectMemberships,
          and(
            eq(projectMemberships.projectId, projects.projectId),
            eq(projectMemberships.actorId, actorId),
          ),
        )
        .orderBy(asc(projects.code)),
    hasAccess: async (actorId, projectId) => {
      const rows = await database
        .select({ projectId: projectMemberships.projectId })
        .from(projectMemberships)
        .where(
          and(
            eq(projectMemberships.actorId, actorId),
            eq(projectMemberships.projectId, projectId),
          ),
        )
        .limit(1);
      return rows.length === 1;
    },
    getActive: async (actorId) => {
      const rows = await database
        .select({
          actorId: activeProjectContexts.actorId,
          actorRole: activeProjectContexts.actorRole,
          projectId: activeProjectContexts.projectId,
          selectedAt: activeProjectContexts.selectedAt,
        })
        .from(activeProjectContexts)
        .where(eq(activeProjectContexts.actorId, actorId))
        .limit(1);
      const active = rows[0];
      if (!active) return null;
      return {
        ...active,
        actorRole: active.actorRole as "TECHNICAL" | "ADMIN",
      };
    },
  };

  const history: ProjectHistoryQueryPort = {
    listExecutions: async (projectId, limit) => {
      const rows = await database
        .select()
        .from(toolExecutions)
        .where(eq(toolExecutions.projectId, projectId))
        .orderBy(desc(toolExecutions.startedAt))
        .limit(limit);
      return rows.map(
        (row): ExecutionRecordDraft => ({
          ...row,
          actorType: row.actorType as ExecutionRecordDraft["actorType"],
          actorRole: row.actorRole as ExecutionRecordDraft["actorRole"],
          state: row.state as ExecutionRecordDraft["state"],
        }),
      );
    },
    listAuditEvents: async (projectId, limit) => {
      const rows = await database
        .select()
        .from(auditEvents)
        .where(eq(auditEvents.projectId, projectId))
        .orderBy(desc(auditEvents.occurredAt))
        .limit(limit);
      return rows.map(
        (row): AuditRecordDraft => ({
          ...row,
          actorType: row.actorType as AuditRecordDraft["actorType"],
          actorRole: row.actorRole as AuditRecordDraft["actorRole"],
          result: row.result as AuditRecordDraft["result"],
        }),
      );
    },
  };

  return Object.freeze({ history, queries, transaction });
}
