CREATE TABLE "office"."master_ahsps" ("ahsp_id" uuid PRIMARY KEY NOT NULL, "source_edition" varchar(200) NOT NULL, "official_code" varchar(80) NOT NULL, "official_description" varchar(500) NOT NULL, "work_unit_raw" varchar(80) NOT NULL, "work_unit_canonical" varchar(80) NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX "master_ahsps_edition_code_unique" ON "office"."master_ahsps" ("source_edition","official_code");
--> statement-breakpoint
CREATE TABLE "office"."resources" ("resource_id" uuid PRIMARY KEY NOT NULL, "resource_name" varchar(300) NOT NULL, "unit_raw_reference" varchar(80) NOT NULL, "unit_canonical" varchar(80) NOT NULL);
--> statement-breakpoint
CREATE TABLE "office"."ahsp_components" ("ahsp_component_id" uuid PRIMARY KEY NOT NULL, "ahsp_id" uuid NOT NULL REFERENCES "office"."master_ahsps"("ahsp_id") ON DELETE restrict, "resource_id" uuid NOT NULL REFERENCES "office"."resources"("resource_id") ON DELETE restrict, "component_group" varchar(20) NOT NULL, "coefficient" varchar(100) NOT NULL, "source_unit_raw" varchar(80) NOT NULL, "source_unit_canonical" varchar(80) NOT NULL, "resolution_state" varchar(20) NOT NULL);
--> statement-breakpoint
CREATE TABLE "office"."base_prices" ("resource_id" uuid PRIMARY KEY NOT NULL REFERENCES "office"."resources"("resource_id") ON DELETE restrict, "price_value" varchar(100), "price_state" varchar(20) NOT NULL, "price_unit_raw" varchar(80) NOT NULL, "zero_intent" varchar(500));
--> statement-breakpoint
CREATE TABLE "office"."project_hsp_snapshots" ("hsp_id" uuid PRIMARY KEY NOT NULL, "project_id" uuid NOT NULL REFERENCES "office"."projects"("project_id") ON DELETE restrict, "ahsp_id" uuid NOT NULL REFERENCES "office"."master_ahsps"("ahsp_id") ON DELETE restrict, "work_unit_raw" varchar(80) NOT NULL, "component_snapshot" jsonb NOT NULL);
