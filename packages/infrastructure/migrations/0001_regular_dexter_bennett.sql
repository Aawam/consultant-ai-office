CREATE SCHEMA IF NOT EXISTS "office";
--> statement-breakpoint
CREATE TABLE "office"."active_project_contexts" (
	"actor_id" varchar(120) PRIMARY KEY NOT NULL,
	"actor_role" varchar(20) NOT NULL,
	"project_id" uuid NOT NULL,
	"selected_at" timestamp with time zone NOT NULL,
	CONSTRAINT "active_project_contexts_role_check" CHECK ("office"."active_project_contexts"."actor_role" in ('TECHNICAL', 'ADMIN'))
);
--> statement-breakpoint
CREATE TABLE "office"."audit_events" (
	"audit_id" uuid PRIMARY KEY NOT NULL,
	"event_name" varchar(120) NOT NULL,
	"request_id" varchar(160) NOT NULL,
	"project_id" uuid NOT NULL,
	"actor_id" varchar(120) NOT NULL,
	"actor_type" varchar(20) NOT NULL,
	"actor_role" varchar(20) NOT NULL,
	"action" varchar(120) NOT NULL,
	"result" varchar(20) NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"approval_reference" varchar(160),
	"sanitized_summary" jsonb NOT NULL,
	CONSTRAINT "audit_events_actor_type_check" CHECK ("office"."audit_events"."actor_type" in ('HUMAN', 'AI_AGENT', 'SYSTEM')),
	CONSTRAINT "audit_events_actor_role_check" CHECK ("office"."audit_events"."actor_role" in ('TECHNICAL', 'ADMIN')),
	CONSTRAINT "audit_events_result_check" CHECK ("office"."audit_events"."result" in ('SUCCEEDED', 'FAILED', 'CANCELLED'))
);
--> statement-breakpoint
CREATE TABLE "office"."project_memberships" (
	"project_id" uuid NOT NULL,
	"actor_id" varchar(120) NOT NULL,
	"actor_role" varchar(20) NOT NULL,
	"granted_at" timestamp with time zone NOT NULL,
	CONSTRAINT "project_memberships_project_id_actor_id_pk" PRIMARY KEY("project_id","actor_id"),
	CONSTRAINT "project_memberships_role_check" CHECK ("office"."project_memberships"."actor_role" in ('TECHNICAL', 'ADMIN'))
);
--> statement-breakpoint
CREATE TABLE "office"."projects" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(120) NOT NULL,
	"created_by" varchar(120) NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "office"."tool_executions" (
	"execution_id" uuid PRIMARY KEY NOT NULL,
	"request_id" varchar(160) NOT NULL,
	"project_id" uuid NOT NULL,
	"actor_id" varchar(120) NOT NULL,
	"actor_type" varchar(20) NOT NULL,
	"actor_role" varchar(20) NOT NULL,
	"action" varchar(120) NOT NULL,
	"state" varchar(20) NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"approval_reference" varchar(160),
	"error_code" varchar(80),
	CONSTRAINT "tool_executions_actor_type_check" CHECK ("office"."tool_executions"."actor_type" in ('HUMAN', 'AI_AGENT', 'SYSTEM')),
	CONSTRAINT "tool_executions_actor_role_check" CHECK ("office"."tool_executions"."actor_role" in ('TECHNICAL', 'ADMIN')),
	CONSTRAINT "tool_executions_state_check" CHECK ("office"."tool_executions"."state" in ('SUCCEEDED', 'FAILED', 'CANCELLED'))
);
--> statement-breakpoint
ALTER TABLE "office"."active_project_contexts" ADD CONSTRAINT "active_project_contexts_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "office"."projects"("project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office"."audit_events" ADD CONSTRAINT "audit_events_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "office"."projects"("project_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office"."project_memberships" ADD CONSTRAINT "project_memberships_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "office"."projects"("project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office"."tool_executions" ADD CONSTRAINT "tool_executions_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "office"."projects"("project_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_project_occurred_idx" ON "office"."audit_events" USING btree ("project_id","occurred_at");--> statement-breakpoint
CREATE INDEX "project_memberships_actor_idx" ON "office"."project_memberships" USING btree ("actor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_code_unique" ON "office"."projects" USING btree ("code");--> statement-breakpoint
CREATE INDEX "tool_executions_project_started_idx" ON "office"."tool_executions" USING btree ("project_id","started_at");
