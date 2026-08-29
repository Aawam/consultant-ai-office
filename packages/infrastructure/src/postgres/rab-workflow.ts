import { eq } from "drizzle-orm";
import { drizzle, type NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type { Pool } from "pg";
import type { RabVersion } from "@consultant-ai-office/domain";
import type { OfficialHspSnapshot, OfficialHspSnapshotPort, RabTransactionPort, RabUnitOfWork, RabWorkflowRepository } from "@consultant-ai-office/application";
import { ahspComponents, auditEvents, basePrices, masterAhsps, postgresSchema, projectHspSnapshots, rabVersions, resources, toolExecutions } from "./schema";

type OfficeExecutor = PgDatabase<NodePgQueryResultHKT, typeof postgresSchema>;
function serialize(rab: RabVersion) {
  return { rabVersionId: rab.rabVersionId, projectId: rab.projectId, revisionOfRabVersionId: rab.revisionOfRabVersionId, revisionNumber: String(rab.revisionNumber), status: rab.status, sourceData: { title: rab.title, ohProfitRate: rab.ohProfitRate, ppnRate: rab.ppnRate, items: rab.items, createdBy: rab.createdBy }, validationEvidence: rab.validation, calculationSnapshot: rab.calculationSnapshot, warningConfirmations: rab.confirmedWarningCodes, createdAt: rab.createdAt, updatedAt: rab.updatedAt };
}
function deserialize(row: typeof rabVersions.$inferSelect): RabVersion {
  const source = row.sourceData as { title: string; ohProfitRate: string; ppnRate: string; items: RabVersion["items"]; createdBy: string };
  const calculationSnapshot = row.calculationSnapshot as RabVersion["calculationSnapshot"];
  return { rabVersionId: row.rabVersionId, projectId: row.projectId, revisionOfRabVersionId: row.revisionOfRabVersionId, revisionNumber: Number(row.revisionNumber), status: row.status as RabVersion["status"], title: source.title, ohProfitRate: source.ohProfitRate, ppnRate: source.ppnRate, items: source.items, validation: row.validationEvidence as RabVersion["validation"], calculationSnapshot: calculationSnapshot === null ? null : { ...calculationSnapshot, calculatedAt: new Date(calculationSnapshot.calculatedAt) }, confirmedWarningCodes: row.warningConfirmations as readonly string[], createdBy: source.createdBy, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) };
}
function unitOfWork(executor: OfficeExecutor): RabUnitOfWork {
  return {
    rabs: { create: async (rab) => { await executor.insert(rabVersions).values(serialize(rab)); }, replace: async (rab) => { await executor.update(rabVersions).set(serialize(rab)).where(eq(rabVersions.rabVersionId, rab.rabVersionId)); } },
    executions: { append: async (execution) => { await executor.insert(toolExecutions).values(execution); } },
    audit: { append: async (audit) => { await executor.insert(auditEvents).values(audit); } },
  };
}
export function createPostgresRabWorkflow(options: { readonly pool: Pool }): { readonly rabs: RabWorkflowRepository; readonly transaction: RabTransactionPort } {
  const database = drizzle(options.pool, { schema: postgresSchema });
  return {
    rabs: { get: async (rabVersionId) => { const row = (await database.select().from(rabVersions).where(eq(rabVersions.rabVersionId, rabVersionId)).limit(1))[0]; return row ? deserialize(row) : null; } },
    transaction: { execute: async (operation) => database.transaction((tx) => operation(unitOfWork(tx))) },
  };
}

export interface OfficialHspSnapshotSeed extends OfficialHspSnapshot { readonly projectId: string; readonly sourceEdition: string; readonly officialCode: string; readonly officialDescription: string; readonly workUnitCanonical: string; readonly componentsWithIdentity: readonly { readonly ahspComponentId: string; readonly resourceId: string; readonly resourceName: string; readonly resourceUnitRaw: string; readonly resourceUnitCanonical: string; readonly group: "TENAGA" | "BAHAN" | "ALAT"; readonly coefficient: string; readonly resolutionState: "RESOLVED" | "AMBIGUOUS" | "UNRESOLVED"; readonly basePrice: { readonly priceValue: string | null; readonly priceState: "MISSING" | "SET" | "ZERO_CONFIRMED"; readonly priceUnitRaw: string; readonly zeroIntent: string | null } }[]; }
export function createPostgresOfficialHspSnapshots(options: { readonly pool: Pool }): OfficialHspSnapshotPort & { seed(snapshot: OfficialHspSnapshotSeed): Promise<void> } {
  const database = drizzle(options.pool, { schema: postgresSchema });
  return {
    seed: async (snapshot) => database.transaction(async (tx) => {
      await tx.insert(masterAhsps).values({ ahspId: snapshot.ahspId, sourceEdition: snapshot.sourceEdition, officialCode: snapshot.officialCode, officialDescription: snapshot.officialDescription, workUnitRaw: snapshot.workUnitRaw, workUnitCanonical: snapshot.workUnitCanonical });
      for (const component of snapshot.componentsWithIdentity) {
        await tx.insert(resources).values({ resourceId: component.resourceId, resourceName: component.resourceName, unitRawReference: component.resourceUnitRaw, unitCanonical: component.resourceUnitCanonical });
        await tx.insert(basePrices).values({ resourceId: component.resourceId, ...component.basePrice });
        await tx.insert(ahspComponents).values({ ahspComponentId: component.ahspComponentId, ahspId: snapshot.ahspId, resourceId: component.resourceId, componentGroup: component.group, coefficient: component.coefficient, sourceUnitRaw: component.resourceUnitRaw, sourceUnitCanonical: component.resourceUnitCanonical, resolutionState: component.resolutionState });
      }
      await tx.insert(projectHspSnapshots).values({ hspId: snapshot.hspId, projectId: snapshot.projectId, ahspId: snapshot.ahspId, workUnitRaw: snapshot.workUnitRaw, componentSnapshot: snapshot.components });
    }),
    resolve: async (hspId) => { const row = (await database.select().from(projectHspSnapshots).where(eq(projectHspSnapshots.hspId, hspId)).limit(1))[0]; return row ? { hspId: row.hspId, ahspId: row.ahspId, workUnitRaw: row.workUnitRaw, components: row.componentSnapshot as OfficialHspSnapshot["components"] } : null; },
  };
}
