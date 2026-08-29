import { describe, expect, it } from "vitest";

import {
  ApplicationError,
  CreateRabDraftUseCase,
  FinalizeRabUseCase,
  CreateRabRevisionUseCase,
  ReturnRabToDraftUseCase,
  SubmitRabForReviewUseCase,
  type RabWorkflowRepository,
  type RabTransactionPort,
} from "@consultant-ai-office/application";
import type { RequestContext } from "@consultant-ai-office/domain";

const technical: RequestContext = {
  requestId: "rab-technical",
  projectId: "project-a",
  actor: { actorId: "technical-1", actorType: "HUMAN", actorRole: "TECHNICAL" },
};
const admin: RequestContext = {
  requestId: "rab-admin",
  projectId: "project-a",
  actor: { actorId: "admin-1", actorType: "HUMAN", actorRole: "ADMIN" },
};

function repository(): RabWorkflowRepository & { readonly values: Map<string, unknown>; readonly transaction: RabTransactionPort } {
  const values = new Map<string, unknown>();
  return {
    values,
    get: async (rabVersionId) => (values.get(rabVersionId) as never) ?? null,
    transaction: { execute: async (operation) => operation({ rabs: { create: async (rab) => void values.set(rab.rabVersionId, rab), replace: async (rab) => void values.set(rab.rabVersionId, rab) }, executions: { append: async () => undefined }, audit: { append: async () => undefined } }) },
  };
}

const directVolume = {
  kind: "DIRECT" as const,
  quantityKind: "SIMPLE" as const,
  basis: "jumlah unit",
  source: "gambar A-01",
  note: "dua unit",
  reviewerId: "admin-1",
};

describe("RAB application workflow", () => {
  it("keeps D-023/D-024 draft errors out of REVIEW without mutation", async () => {
    const store = repository();
    const create = new CreateRabDraftUseCase(store, store.transaction, { now: () => new Date("2026-08-29T03:00:00.000Z") }, { next: () => crypto.randomUUID() });
    const submit = new SubmitRabForReviewUseCase(store, store.transaction, { now: () => new Date("2026-08-29T03:00:00.000Z") });
    const rab = await create.execute(technical, {
      title: "RAB zero", ohProfitRate: "0.10", ppnRate: "0.11",
      items: [{ itemId: "item-1", description: "Manual", volume: "0", volumeUnitRaw: "m2", volumeSource: directVolume, hsp: { kind: "MANUAL_NON_AHSP", unitRaw: "m2", manualHsp: "0", note: "exception" } }],
    });

    await expect(submit.execute(technical, { rabVersionId: rab.rabVersionId })).rejects.toMatchObject<ApplicationError>({ code: "VALIDATION_ERROR" });
    expect((await store.get(rab.rabVersionId))?.status).toBe("DRAFT");
  });

  it("allows warning-only REVIEW but requires ADMIN warning confirmation before FINAL", async () => {
    const store = repository();
    let n = 0;
    const ids = { next: () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}` };
    const clock = { now: () => new Date("2026-08-29T03:00:00.000Z") };
    const create = new CreateRabDraftUseCase(store, store.transaction, clock, ids);
    const submit = new SubmitRabForReviewUseCase(store, store.transaction, clock);
    const finalize = new FinalizeRabUseCase(store, store.transaction, clock);
    const rab = await create.execute(technical, {
      title: "RAB warning", ohProfitRate: "0.10", ppnRate: "0.11",
      items: [{ itemId: "item-1", description: "Manual", volume: "2", volumeUnitRaw: "m2", volumeSource: directVolume, hsp: { kind: "MANUAL_NON_AHSP", unitRaw: "m2", manualHsp: "100", note: "exception" } }],
    });
    const reviewed = await submit.execute(technical, { rabVersionId: rab.rabVersionId });
    expect(reviewed.status).toBe("REVIEW");
    expect(reviewed.calculationSnapshot?.totals.totalFinal).toBe("0");

    await expect(finalize.execute(admin, { rabVersionId: rab.rabVersionId, confirmedWarningCodes: [] })).rejects.toMatchObject<ApplicationError>({ code: "VALIDATION_ERROR" });
    await expect(finalize.execute(technical, { rabVersionId: rab.rabVersionId, confirmedWarningCodes: ["DIRECT_VOLUME_REVIEW_REQUIRED", "MANUAL_HSP_REVIEW_REQUIRED"] })).rejects.toMatchObject<ApplicationError>({ code: "FORBIDDEN" });
    await expect(finalize.execute(admin, { rabVersionId: rab.rabVersionId, confirmedWarningCodes: ["DIRECT_VOLUME_REVIEW_REQUIRED", "MANUAL_HSP_REVIEW_REQUIRED"] })).resolves.toMatchObject({ status: "FINAL" });
  });

  it("returns REVIEW to the same revision and makes every FINAL change a new DRAFT revision", async () => {
    const store = repository();
    let n = 0;
    const ids = { next: () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}` };
    const clock = { now: () => new Date("2026-08-29T03:00:00.000Z") };
    const rab = await new CreateRabDraftUseCase(store, store.transaction, clock, ids).execute(technical, {
      title: "RAB lifecycle", ohProfitRate: "0.10", ppnRate: "0.11",
      items: [{ itemId: "item-1", description: "Manual", volume: "2", volumeUnitRaw: "m2", volumeSource: directVolume, hsp: { kind: "MANUAL_NON_AHSP", unitRaw: "m2", manualHsp: "100", note: "exception" } }],
    });
    await new SubmitRabForReviewUseCase(store, store.transaction, clock).execute(technical, { rabVersionId: rab.rabVersionId });
    const returned = await new ReturnRabToDraftUseCase(store, store.transaction, clock).execute(admin, { rabVersionId: rab.rabVersionId });
    expect(returned).toMatchObject({ rabVersionId: rab.rabVersionId, revisionNumber: 1, status: "DRAFT" });
    await new SubmitRabForReviewUseCase(store, store.transaction, clock).execute(technical, { rabVersionId: rab.rabVersionId });
    await new FinalizeRabUseCase(store, store.transaction, clock).execute(admin, { rabVersionId: rab.rabVersionId, confirmedWarningCodes: ["DIRECT_VOLUME_REVIEW_REQUIRED", "MANUAL_HSP_REVIEW_REQUIRED"] });
    const revision = await new CreateRabRevisionUseCase(store, store.transaction, clock, ids).execute(technical, { rabVersionId: rab.rabVersionId });
    expect(revision).toMatchObject({ status: "DRAFT", revisionNumber: 2, revisionOfRabVersionId: rab.rabVersionId });
    await expect(new ReturnRabToDraftUseCase(store, store.transaction, clock).execute(admin, { rabVersionId: rab.rabVersionId })).rejects.toMatchObject<ApplicationError>({ code: "VALIDATION_ERROR" });
  });
});
