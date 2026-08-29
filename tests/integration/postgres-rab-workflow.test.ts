import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CreateProjectUseCase,
  CreateRabDraftUseCase,
  CreateRabRevisionUseCase,
  FinalizeRabUseCase,
  ReturnRabToDraftUseCase,
  SubmitRabForReviewUseCase,
} from "@consultant-ai-office/application";
import type { RabVersion, RequestContext } from "@consultant-ai-office/domain";
import { createPostgresOfficialHspSnapshots, createPostgresProjectFoundation, createPostgresRabWorkflow } from "@consultant-ai-office/infrastructure";

const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) throw new Error("TEST_DATABASE_URL is required for PostgreSQL integration tests; tests are not skipped");

const technical: RequestContext = { requestId: "rab-db-technical", projectId: null, actor: { actorId: "rab-technical", actorType: "HUMAN", actorRole: "TECHNICAL" } };
const admin: RequestContext = { requestId: "rab-db-admin", projectId: null, actor: { actorId: "rab-admin", actorType: "HUMAN", actorRole: "ADMIN" } };
const directVolume = { kind: "DIRECT" as const, quantityKind: "SIMPLE" as const, basis: "jumlah unit", source: "gambar A-01", note: "dua unit", reviewerId: "rab-admin" };

describe("PostgreSQL RAB workflow vertical slice", () => {
  const pool = new Pool({ connectionString });
  const projectRuntime = createPostgresProjectFoundation({ pool });
  const rabRuntime = createPostgresRabWorkflow({ pool });
  const hspSnapshots = createPostgresOfficialHspSnapshots({ pool });
  let sequence = 0;
  const ids = { next: () => `30000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}` };
  const clock = { now: () => new Date("2026-08-29T04:00:00.000Z") };
  let projectId: string;

  beforeAll(async () => {
    await pool.query("TRUNCATE office.audit_events, office.tool_executions, office.rab_versions, office.project_hsp_snapshots, office.ahsp_components, office.base_prices, office.master_ahsps, office.resources, office.active_project_contexts, office.project_memberships, office.projects CASCADE");
    const project = await new CreateProjectUseCase({ transaction: projectRuntime.transaction, clock, ids }).execute(technical, { project: { name: "RAB Integration", code: "RAB-DB" }, initiation: { kind: "HUMAN_DIRECT" } });
    projectId = project.project.projectId;
  });
  afterAll(async () => { await pool.end(); });

  async function seedOfficial(hspId: string, ahspId: string, componentId: string, resourceId: string, overrides: Partial<{ priceValue: string | null; priceState: "MISSING" | "SET" | "ZERO_CONFIRMED"; zeroIntent: string | null; resolutionState: "RESOLVED" | "AMBIGUOUS" | "UNRESOLVED"; resourceUnitRaw: string; priceUnitRaw: string }> = {}) {
    await hspSnapshots.seed({ hspId, ahspId, projectId, sourceEdition: "SE-47-2026", officialCode: hspId, officialDescription: "Official test AHSP", workUnitRaw: "m2", workUnitCanonical: "m2", components: [{ componentId, group: "TENAGA", coefficient: "2", resourceUnitRaw: overrides.resourceUnitRaw ?? "OH", resolutionState: overrides.resolutionState ?? "RESOLVED", basePrice: { priceValue: overrides.priceValue === undefined ? "10" : overrides.priceValue, priceState: overrides.priceState ?? "SET", priceUnitRaw: overrides.priceUnitRaw ?? "OH", zeroIntent: overrides.zeroIntent ?? null } }], componentsWithIdentity: [{ ahspComponentId: componentId, resourceId, resourceName: "Pekerja", resourceUnitRaw: overrides.resourceUnitRaw ?? "OH", resourceUnitCanonical: "OH", group: "TENAGA", coefficient: "2", resolutionState: overrides.resolutionState ?? "RESOLVED", basePrice: { priceValue: overrides.priceValue === undefined ? "10" : overrides.priceValue, priceState: overrides.priceState ?? "SET", priceUnitRaw: overrides.priceUnitRaw ?? "OH", zeroIntent: overrides.zeroIntent ?? null } }] });
  }
  function officialItem(hspId: string) { return { hspId, itemId: `item-${hspId}`, description: "Official", volume: "2", volumeUnitRaw: "m2", volumeSource: { kind: "BACKUP_VOLUME" as const, bvReferenceId: "bv-1" }, hsp: { kind: "OFFICIAL_AHSP" as const, unitRaw: "m2", hspValue: "0", components: [] } }; }

  it("persists project-scoped DRAFT → REVIEW → DRAFT → FINAL → revision with snapshots and audit", async () => {
    const context = { ...technical, projectId };
    const create = new CreateRabDraftUseCase(rabRuntime.rabs, rabRuntime.transaction, clock, ids);
    const submit = new SubmitRabForReviewUseCase(rabRuntime.rabs, rabRuntime.transaction, clock);
    const returned = new ReturnRabToDraftUseCase(rabRuntime.rabs, rabRuntime.transaction, clock);
    const finalize = new FinalizeRabUseCase(rabRuntime.rabs, rabRuntime.transaction, clock);
    const revise = new CreateRabRevisionUseCase(rabRuntime.rabs, rabRuntime.transaction, clock, ids);
    const rab = await create.execute(context, { title: "RAB integration", ohProfitRate: "0.10", ppnRate: "0.11", items: [{ itemId: "item-1", description: "Manual", volume: "2", volumeUnitRaw: "m2", volumeSource: directVolume, hsp: { kind: "MANUAL_NON_AHSP", unitRaw: "m2", manualHsp: "100", note: "exception" } }] });
    await submit.execute(context, { rabVersionId: rab.rabVersionId });
    await returned.execute({ ...admin, projectId }, { rabVersionId: rab.rabVersionId });
    await submit.execute(context, { rabVersionId: rab.rabVersionId });
    await finalize.execute({ ...admin, projectId }, { rabVersionId: rab.rabVersionId, confirmedWarningCodes: ["DIRECT_VOLUME_REVIEW_REQUIRED", "MANUAL_HSP_REVIEW_REQUIRED"] });
    const revision = await revise.execute(context, { rabVersionId: rab.rabVersionId });
    expect(await rabRuntime.rabs.get(rab.rabVersionId)).toMatchObject({ status: "FINAL", calculationSnapshot: expect.any(Object), confirmedWarningCodes: ["DIRECT_VOLUME_REVIEW_REQUIRED", "MANUAL_HSP_REVIEW_REQUIRED"] });
    expect(await rabRuntime.rabs.get(revision.rabVersionId)).toMatchObject({ status: "DRAFT", revisionOfRabVersionId: rab.rabVersionId, revisionNumber: 2 });
    await expect(pool.query("select action from office.audit_events where project_id = $1 and action like 'rab.%' order by action", [projectId])).resolves.toMatchObject({ rows: expect.arrayContaining([expect.objectContaining({ action: "rab.create_draft" }), expect.objectContaining({ action: "rab.finalize" })]) });
  });

  it("rolls back RAB mutation when the transaction fails", async () => {
    const rab: RabVersion = { rabVersionId: "30000000-0000-4000-8000-000000009999", projectId, revisionOfRabVersionId: null, revisionNumber: 1, title: "Rollback", status: "DRAFT", ohProfitRate: "0.10", ppnRate: "0.11", items: [], validation: null, calculationSnapshot: null, confirmedWarningCodes: [], createdBy: technical.actor.actorId, createdAt: clock.now(), updatedAt: clock.now() };
    await expect(rabRuntime.transaction.execute(async (unitOfWork) => { await unitOfWork.rabs.create(rab); throw new Error("forced RAB rollback"); })).rejects.toThrow("forced RAB rollback");
    await expect(rabRuntime.rabs.get(rab.rabVersionId)).resolves.toBeNull();
  });

  it("binds an official AHSP snapshot with stable IDs through REVIEW, FINAL, and PostgreSQL reload", async () => {
    const hspId = "40000000-0000-4000-8000-000000000001"; const ahspId = "40000000-0000-4000-8000-000000000002"; const componentId = "40000000-0000-4000-8000-000000000003"; const resourceId = "40000000-0000-4000-8000-000000000004";
    await seedOfficial(hspId, ahspId, componentId, resourceId);
    const context = { ...technical, projectId };
    const create = new CreateRabDraftUseCase(rabRuntime.rabs, rabRuntime.transaction, clock, ids, hspSnapshots);
    const submit = new SubmitRabForReviewUseCase(rabRuntime.rabs, rabRuntime.transaction, clock);
    const finalize = new FinalizeRabUseCase(rabRuntime.rabs, rabRuntime.transaction, clock);
    const rab = await create.execute(context, { title: "Official RAB", ohProfitRate: "0.10", ppnRate: "0.11", items: [officialItem(hspId)] });
    const reviewed = await submit.execute(context, { rabVersionId: rab.rabVersionId });
    expect(reviewed.calculationSnapshot?.itemValues[`item-${hspId}`]).toBe("44");
    await finalize.execute({ ...admin, projectId }, { rabVersionId: rab.rabVersionId, confirmedWarningCodes: [] });
    const reloaded = await rabRuntime.rabs.get(rab.rabVersionId);
    expect(reloaded).toMatchObject({ status: "FINAL", calculationSnapshot: reviewed.calculationSnapshot });
    await expect(pool.query(`select h.hsp_id, h.ahsp_id, c.ahsp_component_id, c.resource_id from office.project_hsp_snapshots h join office.ahsp_components c on c.ahsp_id = h.ahsp_id where h.hsp_id = $1`, [hspId])).resolves.toMatchObject({ rows: [{ hsp_id: hspId, ahsp_id: ahspId, ahsp_component_id: componentId, resource_id: resourceId }] });
  });

  it("keeps REVIEW/FINAL calculation bound after live base-price changes", async () => {
    const hspId = "50000000-0000-4000-8000-000000000001"; const ahspId = "50000000-0000-4000-8000-000000000002"; const componentId = "50000000-0000-4000-8000-000000000003"; const resourceId = "50000000-0000-4000-8000-000000000004";
    await seedOfficial(hspId, ahspId, componentId, resourceId);
    const context = { ...technical, projectId }; const create = new CreateRabDraftUseCase(rabRuntime.rabs, rabRuntime.transaction, clock, ids, hspSnapshots); const submit = new SubmitRabForReviewUseCase(rabRuntime.rabs, rabRuntime.transaction, clock); const finalize = new FinalizeRabUseCase(rabRuntime.rabs, rabRuntime.transaction, clock);
    const rab = await create.execute(context, { title: "Immutable", ohProfitRate: "0.10", ppnRate: "0.11", items: [officialItem(hspId)] }); const reviewed = await submit.execute(context, { rabVersionId: rab.rabVersionId });
    await pool.query("update office.base_prices set price_value = '9999' where resource_id = $1", [resourceId]);
    expect((await rabRuntime.rabs.get(rab.rabVersionId))?.calculationSnapshot).toEqual(reviewed.calculationSnapshot);
    await expect(finalize.execute({ ...admin, projectId }, { rabVersionId: rab.rabVersionId, confirmedWarningCodes: [] })).resolves.toMatchObject({ calculationSnapshot: reviewed.calculationSnapshot, status: "FINAL" });
  });

  it.each([
    ["MISSING", null, null, "RESOLVED", "OH", "OH", "MISSING_BASE_PRICE"],
    ["SET", "0", null, "RESOLVED", "OH", "OH", "UNRESOLVED_ZERO_BASE_PRICE"],
    ["SET", "10", null, "AMBIGUOUS", "OH", "OH", "COMPONENT_AMBIGUOUS"],
    ["SET", "10", null, "RESOLVED", "kg", "OH", "COMPONENT_PRICE_UNIT_INCOMPATIBLE"],
  ] as const)("blocks REVIEW for canonical invalid master state %s", async (priceState, priceValue, zeroIntent, resolutionState, resourceUnitRaw, priceUnitRaw, issueCode) => {
    const suffix = String(++sequence).padStart(12, "0"); const hspId = `60000000-0000-4000-8000-${suffix}`; const ahspId = `60000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`; const componentId = `60000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`; const resourceId = `60000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`;
    await seedOfficial(hspId, ahspId, componentId, resourceId, { priceState, priceValue, zeroIntent, resolutionState, resourceUnitRaw, priceUnitRaw });
    const rab = await new CreateRabDraftUseCase(rabRuntime.rabs, rabRuntime.transaction, clock, ids, hspSnapshots).execute({ ...technical, projectId }, { title: "Invalid master", ohProfitRate: "0.10", ppnRate: "0.11", items: [officialItem(hspId)] });
    await expect(new SubmitRabForReviewUseCase(rabRuntime.rabs, rabRuntime.transaction, clock).execute({ ...technical, projectId }, { rabVersionId: rab.rabVersionId })).rejects.toMatchObject({ code: "VALIDATION_ERROR", details: { issues: expect.arrayContaining([expect.objectContaining({ code: issueCode })]) } });
  });

  it("allows ZERO_CONFIRMED only as a WARNING path", async () => {
    const hspId = "70000000-0000-4000-8000-000000000001"; const ahspId = "70000000-0000-4000-8000-000000000002"; const componentId = "70000000-0000-4000-8000-000000000003"; const resourceId = "70000000-0000-4000-8000-000000000004";
    await seedOfficial(hspId, ahspId, componentId, resourceId, { priceState: "ZERO_CONFIRMED", priceValue: "0", zeroIntent: "confirmed by reviewer" });
    const rab = await new CreateRabDraftUseCase(rabRuntime.rabs, rabRuntime.transaction, clock, ids, hspSnapshots).execute({ ...technical, projectId }, { title: "Zero confirmed", ohProfitRate: "0.10", ppnRate: "0.11", items: [officialItem(hspId)] });
    await expect(new SubmitRabForReviewUseCase(rabRuntime.rabs, rabRuntime.transaction, clock).execute({ ...technical, projectId }, { rabVersionId: rab.rabVersionId })).resolves.toMatchObject({ status: "REVIEW", validation: { reviewBlocked: false, issues: expect.arrayContaining([expect.objectContaining({ code: "ZERO_BASE_PRICE_CONFIRMED", severity: "WARNING" })]) } });
  });
});
