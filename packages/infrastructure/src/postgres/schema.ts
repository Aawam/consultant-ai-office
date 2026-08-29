import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgSchema,
  primaryKey,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const officeSchema = pgSchema("office");

export const projects = officeSchema.table(
  "projects",
  {
    projectId: uuid("project_id").primaryKey(),
    code: varchar("code", { length: 20 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    createdBy: varchar("created_by", { length: 120 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [uniqueIndex("projects_code_unique").on(table.code)],
);

export const projectMemberships = officeSchema.table(
  "project_memberships",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.projectId, { onDelete: "cascade" }),
    actorId: varchar("actor_id", { length: 120 }).notNull(),
    actorRole: varchar("actor_role", { length: 20 }).notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.actorId] }),
    index("project_memberships_actor_idx").on(table.actorId),
    check(
      "project_memberships_role_check",
      sql`${table.actorRole} in ('TECHNICAL', 'ADMIN')`,
    ),
  ],
);

export const activeProjectContexts = officeSchema.table(
  "active_project_contexts",
  {
    actorId: varchar("actor_id", { length: 120 }).primaryKey(),
    actorRole: varchar("actor_role", { length: 20 }).notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.projectId, { onDelete: "cascade" }),
    selectedAt: timestamp("selected_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check(
      "active_project_contexts_role_check",
      sql`${table.actorRole} in ('TECHNICAL', 'ADMIN')`,
    ),
  ],
);

export const toolExecutions = officeSchema.table(
  "tool_executions",
  {
    executionId: uuid("execution_id").primaryKey(),
    requestId: varchar("request_id", { length: 160 }).notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.projectId, { onDelete: "restrict" }),
    actorId: varchar("actor_id", { length: 120 }).notNull(),
    actorType: varchar("actor_type", { length: 20 }).notNull(),
    actorRole: varchar("actor_role", { length: 20 }).notNull(),
    action: varchar("action", { length: 120 }).notNull(),
    state: varchar("state", { length: 20 }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
    approvalReference: varchar("approval_reference", { length: 160 }),
    errorCode: varchar("error_code", { length: 80 }),
  },
  (table) => [
    index("tool_executions_project_started_idx").on(
      table.projectId,
      table.startedAt,
    ),
    check(
      "tool_executions_actor_type_check",
      sql`${table.actorType} in ('HUMAN', 'AI_AGENT', 'SYSTEM')`,
    ),
    check(
      "tool_executions_actor_role_check",
      sql`${table.actorRole} in ('TECHNICAL', 'ADMIN')`,
    ),
    check(
      "tool_executions_state_check",
      sql`${table.state} in ('SUCCEEDED', 'FAILED', 'CANCELLED')`,
    ),
  ],
);

export const auditEvents = officeSchema.table(
  "audit_events",
  {
    auditId: uuid("audit_id").primaryKey(),
    eventName: varchar("event_name", { length: 120 }).notNull(),
    requestId: varchar("request_id", { length: 160 }).notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.projectId, { onDelete: "restrict" }),
    actorId: varchar("actor_id", { length: 120 }).notNull(),
    actorType: varchar("actor_type", { length: 20 }).notNull(),
    actorRole: varchar("actor_role", { length: 20 }).notNull(),
    action: varchar("action", { length: 120 }).notNull(),
    result: varchar("result", { length: 20 }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    approvalReference: varchar("approval_reference", { length: 160 }),
    sanitizedSummary: jsonb("sanitized_summary")
      .$type<Readonly<Record<string, unknown>>>()
      .notNull(),
  },
  (table) => [
    index("audit_events_project_occurred_idx").on(
      table.projectId,
      table.occurredAt,
    ),
    check(
      "audit_events_actor_type_check",
      sql`${table.actorType} in ('HUMAN', 'AI_AGENT', 'SYSTEM')`,
    ),
    check(
      "audit_events_actor_role_check",
      sql`${table.actorRole} in ('TECHNICAL', 'ADMIN')`,
    ),
    check(
      "audit_events_result_check",
      sql`${table.result} in ('SUCCEEDED', 'FAILED', 'CANCELLED')`,
    ),
  ],
);

export const postgresSchema = {
  activeProjectContexts,
  auditEvents,
  projectMemberships,
  projects,
  toolExecutions,
};
