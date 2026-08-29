import { calculateHsp, calculateProjectTotals, calculateRabItem, validateRabForReview, type RabItemReviewInput } from "@consultant-ai-office/rab-calculation-engine";
import type { ClockPort, RabItemInput, RabVersion, RequestContext } from "@consultant-ai-office/domain";
import { RoleAuthorizationPolicy } from "./authorization";
import { ApplicationError } from "./errors";
import type { IdGeneratorPort } from "./project-ports";
import type { OfficialHspSnapshotPort, RabTransactionPort, RabWorkflowRepository } from "./rab-ports";
import { buildRabExportSnapshot } from "./rab-export";
export type ProjectRabItemInput = RabItemReviewInput & { readonly hspId?: string };
export interface CreateRabDraftRequest { readonly title: string; readonly ohProfitRate: string; readonly ppnRate: string; readonly items: readonly ProjectRabItemInput[]; }

function assertContext(context: RequestContext, rab: RabVersion): void { if (context.projectId === null || context.projectId !== rab.projectId) throw new ApplicationError("FORBIDDEN", "RAB is outside the active project context"); }
function assertDraft(rab: RabVersion): void { if (rab.status !== "DRAFT") throw new ApplicationError("VALIDATION_ERROR", "Only a DRAFT RAB is editable"); }
function calculateSnapshot(rab: RabVersion, calculatedAt: Date) {
  const items = rab.items as unknown as readonly RabItemReviewInput[];
  const itemValues: Record<string, string> = {};
  const values = items.map((item) => {
    const hsp = item.hsp.kind === "OFFICIAL_AHSP" ? calculateHsp({ kind: "OFFICIAL_AHSP", components: item.hsp.components, ohProfitRate: rab.ohProfitRate }) : calculateHsp({ kind: "MANUAL_NON_AHSP", manualHsp: item.hsp.manualHsp, projectOhProfitRate: rab.ohProfitRate });
    const calculated = calculateRabItem({ itemId: item.itemId, volume: item.volume, hspValue: hsp.hspValue });
    itemValues[item.itemId] = calculated.itemValue;
    return calculated.itemValue;
  });
  const totals = calculateProjectTotals({ groupSubtotals: values, ppnRate: rab.ppnRate });
  return { calculatedAt, itemValues, totals: { subtotalRab: totals.subtotalRab, ppnValue: totals.ppnValue, totalBeforeRounding: totals.totalBeforeRounding, totalFinal: totals.totalFinal, roundingDifference: totals.roundingDifference }, exportSnapshot: buildRabExportSnapshot(rab, `${rab.rabVersionId}-snapshot`) };
}

function auditMutation(context: RequestContext, rab: RabVersion, action: string, occurredAt: Date, unitOfWork: import("./rab-ports").RabUnitOfWork): Promise<void> {
  return Promise.all([
    unitOfWork.executions.append({ executionId: crypto.randomUUID(), requestId: context.requestId, projectId: rab.projectId, actorId: context.actor.actorId, actorType: context.actor.actorType, actorRole: context.actor.actorRole, action, state: "SUCCEEDED", startedAt: occurredAt, completedAt: occurredAt, approvalReference: null, errorCode: null }),
    unitOfWork.audit.append({ auditId: crypto.randomUUID(), eventName: "action.succeeded", requestId: context.requestId, projectId: rab.projectId, actorId: context.actor.actorId, actorType: context.actor.actorType, actorRole: context.actor.actorRole, action, result: "SUCCEEDED", occurredAt, approvalReference: null, sanitizedSummary: { rabVersionId: rab.rabVersionId, status: rab.status } }),
  ]).then(() => undefined);
}

export class CreateRabDraftUseCase {
  constructor(private readonly repository: RabWorkflowRepository, private readonly transaction: RabTransactionPort, private readonly clock: ClockPort, private readonly ids: IdGeneratorPort, private readonly officialHspSnapshots?: OfficialHspSnapshotPort) {}
  async execute(context: RequestContext, request: CreateRabDraftRequest): Promise<RabVersion> {
    RoleAuthorizationPolicy.assertAllowed(context.actor, ["TECHNICAL", "ADMIN"], "rab.create_draft");
    if (context.projectId === null || request.title.trim().length === 0) throw new ApplicationError("VALIDATION_ERROR", "Active project context and RAB title are required");
    const items = await Promise.all(request.items.map(async (item) => {
      if (item.hsp.kind !== "OFFICIAL_AHSP") return item;
      if (!item.hspId || !this.officialHspSnapshots) throw new ApplicationError("VALIDATION_ERROR", "Official AHSP requires a project HSP snapshot");
      const snapshot = await this.officialHspSnapshots.resolve(item.hspId);
      if (!snapshot || snapshot.workUnitRaw !== item.hsp.unitRaw) throw new ApplicationError("VALIDATION_ERROR", "Official HSP snapshot is unavailable or incompatible");
      return { ...item, hsp: { ...item.hsp, components: snapshot.components } };
    }));
    const now = this.clock.now();
    const rab: RabVersion = Object.freeze({ rabVersionId: this.ids.next(), projectId: context.projectId, revisionOfRabVersionId: null, revisionNumber: 1, title: request.title.trim(), status: "DRAFT", ohProfitRate: request.ohProfitRate, ppnRate: request.ppnRate, items: items as unknown as readonly RabItemInput[], validation: null, calculationSnapshot: null, confirmedWarningCodes: [], createdBy: context.actor.actorId, createdAt: now, updatedAt: now });
    return this.transaction.execute(async (unitOfWork) => { await unitOfWork.rabs.create(rab); await auditMutation(context, rab, "rab.create_draft", now, unitOfWork); return rab; });
  }
}
export class SubmitRabForReviewUseCase {
  constructor(private readonly repository: RabWorkflowRepository, private readonly transaction: RabTransactionPort, private readonly clock: ClockPort) {}
  async execute(context: RequestContext, request: { readonly rabVersionId: string }): Promise<RabVersion> {
    RoleAuthorizationPolicy.assertAllowed(context.actor, ["TECHNICAL", "ADMIN"], "rab.submit_review");
    const rab = await this.repository.get(request.rabVersionId); if (!rab) throw new ApplicationError("NOT_FOUND", "RAB version was not found"); assertContext(context, rab); assertDraft(rab);
    const validation = validateRabForReview({ ohProfitRate: rab.ohProfitRate, ppnRate: rab.ppnRate, items: rab.items as unknown as readonly RabItemReviewInput[] });
    if (validation.reviewBlocked) throw new ApplicationError("VALIDATION_ERROR", "RAB has validation errors that block REVIEW", { issues: validation.issues });
    let calculationSnapshot; try { calculationSnapshot = calculateSnapshot(rab, this.clock.now()); } catch (error) { throw new ApplicationError("VALIDATION_ERROR", "RAB calculation failed", { cause: error instanceof Error ? error.message : "unknown" }); }
    const reviewed: RabVersion = Object.freeze({ ...rab, status: "REVIEW", validation, calculationSnapshot, updatedAt: this.clock.now() }); return this.transaction.execute(async (unitOfWork) => { await unitOfWork.rabs.replace(reviewed); await auditMutation(context, reviewed, "rab.submit_review", reviewed.updatedAt, unitOfWork); return reviewed; });
  }
}
export class FinalizeRabUseCase {
  constructor(private readonly repository: RabWorkflowRepository, private readonly transaction: RabTransactionPort, private readonly clock: ClockPort) {}
  async execute(context: RequestContext, request: { readonly rabVersionId: string; readonly confirmedWarningCodes: readonly string[] }): Promise<RabVersion> {
    RoleAuthorizationPolicy.assertAllowed(context.actor, ["ADMIN"], "rab.finalize");
    const rab = await this.repository.get(request.rabVersionId); if (!rab) throw new ApplicationError("NOT_FOUND", "RAB version was not found"); assertContext(context, rab);
    if (rab.status !== "REVIEW" || rab.validation === null || rab.calculationSnapshot === null) throw new ApplicationError("VALIDATION_ERROR", "Only a validated REVIEW RAB can be finalized");
    const required = rab.validation.issues.filter((issue) => issue.severity === "WARNING").map((issue) => issue.code);
    if (required.some((code) => !request.confirmedWarningCodes.includes(code))) throw new ApplicationError("VALIDATION_ERROR", "All REVIEW warnings require ADMIN confirmation", { requiredWarningCodes: required });
    const finalized: RabVersion = Object.freeze({ ...rab, status: "FINAL", confirmedWarningCodes: [...new Set(request.confirmedWarningCodes)], updatedAt: this.clock.now() }); return this.transaction.execute(async (unitOfWork) => { await unitOfWork.rabs.replace(finalized); await auditMutation(context, finalized, "rab.finalize", finalized.updatedAt, unitOfWork); return finalized; });
  }
}

export class ReturnRabToDraftUseCase {
  constructor(private readonly repository: RabWorkflowRepository, private readonly transaction: RabTransactionPort, private readonly clock: ClockPort) {}
  async execute(context: RequestContext, request: { readonly rabVersionId: string }): Promise<RabVersion> {
    RoleAuthorizationPolicy.assertAllowed(context.actor, ["ADMIN"], "rab.return_to_draft");
    const rab = await this.repository.get(request.rabVersionId);
    if (!rab) throw new ApplicationError("NOT_FOUND", "RAB version was not found");
    assertContext(context, rab);
    if (rab.status !== "REVIEW") throw new ApplicationError("VALIDATION_ERROR", "Only REVIEW RAB can return to DRAFT");
    const draft: RabVersion = Object.freeze({ ...rab, status: "DRAFT", updatedAt: this.clock.now() });
    return this.transaction.execute(async (unitOfWork) => { await unitOfWork.rabs.replace(draft); await auditMutation(context, draft, "rab.return_to_draft", draft.updatedAt, unitOfWork); return draft; });
  }
}

export class CreateRabRevisionUseCase {
  constructor(private readonly repository: RabWorkflowRepository, private readonly transaction: RabTransactionPort, private readonly clock: ClockPort, private readonly ids: IdGeneratorPort) {}
  async execute(context: RequestContext, request: { readonly rabVersionId: string }): Promise<RabVersion> {
    RoleAuthorizationPolicy.assertAllowed(context.actor, ["TECHNICAL", "ADMIN"], "rab.create_revision");
    const source = await this.repository.get(request.rabVersionId);
    if (!source) throw new ApplicationError("NOT_FOUND", "RAB version was not found");
    assertContext(context, source);
    if (source.status !== "FINAL") throw new ApplicationError("VALIDATION_ERROR", "Only FINAL RAB can create a revision");
    const now = this.clock.now();
    const revision: RabVersion = Object.freeze({ ...source, rabVersionId: this.ids.next(), revisionOfRabVersionId: source.rabVersionId, revisionNumber: source.revisionNumber + 1, status: "DRAFT", validation: null, calculationSnapshot: null, confirmedWarningCodes: [], createdBy: context.actor.actorId, createdAt: now, updatedAt: now });
    return this.transaction.execute(async (unitOfWork) => { await unitOfWork.rabs.create(revision); await auditMutation(context, revision, "rab.create_revision", now, unitOfWork); return revision; });
  }
}
