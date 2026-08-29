CREATE TABLE "office"."rab_versions" (
  "rab_version_id" uuid PRIMARY KEY NOT NULL,
  "project_id" uuid NOT NULL,
  "revision_of_rab_version_id" uuid,
  "revision_number" varchar(20) NOT NULL,
  "status" varchar(20) NOT NULL,
  "source_data" jsonb NOT NULL,
  "validation_evidence" jsonb,
  "calculation_snapshot" jsonb,
  "warning_confirmations" jsonb NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL,
  CONSTRAINT "rab_versions_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "office"."projects"("project_id") ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX "rab_versions_project_idx" ON "office"."rab_versions" USING btree ("project_id","updated_at");
