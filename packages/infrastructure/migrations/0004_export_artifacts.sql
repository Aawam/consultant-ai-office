CREATE TABLE "office"."export_artifacts" (
  "artifact_id" uuid PRIMARY KEY NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "office"."projects"("project_id") ON DELETE restrict,
  "rab_version_id" uuid NOT NULL REFERENCES "office"."rab_versions"("rab_version_id") ON DELETE restrict,
  "snapshot_id" varchar(160) NOT NULL,
  "export_type" varchar(20) NOT NULL,
  "status" varchar(20) NOT NULL,
  "generated_by" varchar(120) NOT NULL,
  "generated_at" timestamp with time zone NOT NULL,
  "file_path" varchar(1000) NOT NULL,
  "sha256" varchar(64) NOT NULL
);
--> statement-breakpoint
CREATE INDEX "export_artifacts_project_generated_idx" ON "office"."export_artifacts" USING btree ("project_id", "generated_at");
