# P0–P1 Integration Handoff

**Workstream:** P0 Application Foundation + P1 Deterministic RAB/EE Core

**Status:** IN PROGRESS — INTEGRATION SLICE VALID, MASTER DATA SNAPSHOT GATE CLOSED.

## 1. Baseline and canonical check

- P0 baseline: `b551cac2efbb5a02e3786a5828ecff11510080fe`.
- P1 baseline: `1103f29ec7f175fecf2eaeb5e31ba6a5af487520` and `3908ee0fdb6c9493fbb18954236957070381b270`.
- Checked authority: canonical index, Decision Log D-001–D-025, P0 PRD, RAB/EE baseline, Jalur A normalization contract, Golden Test contract, Manager closeout, and P0/P1 handoffs.
- No business rule was added. D-023, D-024, D-011, D-013, D-014, D-018, and D-019 are delegated to the existing P1 validation/calculation primitives.

## 2. Implemented integration slice

- Application-layer `RABVersion` workflow model: stable version ID, project ID, status, revision lineage, canonical string rates, item input, validation, calculation snapshot, and warning confirmations.
- `CreateRabDraftUseCase` creates a project-scoped DRAFT.
- `SubmitRabForReviewUseCase` calls the existing P1 `validateRabForReview`; only then calls the existing P1 HSP/item/total calculation functions and binds a calculation snapshot.
- `FinalizeRabUseCase` is ADMIN-only and requires every WARNING code from the bound REVIEW validation evidence to be confirmed.
- `ReturnRabToDraftUseCase` is ADMIN-only and keeps the same RAB version/revision.
- `CreateRabRevisionUseCase` is available to TECHNICAL or ADMIN only from FINAL and creates a new DRAFT preserving the old FINAL.

The slice contains no formula implementation outside `@consultant-ai-office/rab-calculation-engine`; all calculation input values remain decimal strings.

## 3. Domain, persistence, and operational scope

Implemented domain entities are the minimum RAB version/snapshot representation needed for the lifecycle slice. PostgreSQL persists the version's project relation, state, revision lineage, source item data, validation evidence, calculation snapshot, and warning confirmations. Project, membership, active context, execution, and audit persistence remain the P0 implementation.

RAB writes now execute through a dedicated Application transaction port. The PostgreSQL adapter persists the RAB state and appends the existing P0 execution/audit records inside one database transaction.

Normalized `master_ahsps`, `ahsp_components`, `resources`, `base_prices`, and `project_hsp_snapshots` persist the canonical identity chain. An official RAB item stores `hsp_id` in its source input; Application resolves its controlled component snapshot before writing the RAB version. The REVIEW snapshot remains independent of subsequent live base-price changes.

## 4. Test matrix

| Test ID | Layer | Expected | Actual | Result | Evidence |
|---|---|---|---|---|---|
| INT-RAB-01 | Application unit | D-023/D-024 ERROR blocks REVIEW without state mutation | DRAFT retained | PASS | `tests/unit/rab-workflow.test.ts` |
| INT-RAB-02 | Application unit | warning-only REVIEW allowed; ADMIN confirmation required for FINAL | enforced | PASS | `tests/unit/rab-workflow.test.ts` |
| INT-RAB-03 | Application unit | TECHNICAL cannot FINAL | `FORBIDDEN` | PASS | `tests/unit/rab-workflow.test.ts` |
| INT-RAB-04 | Application unit | REVIEW → DRAFT retains revision; FINAL → new DRAFT revision | enforced | PASS | `tests/unit/rab-workflow.test.ts` |
| DB-01 | PostgreSQL runtime | service healthy, migration, transaction and rollback | PostgreSQL 15 cluster on `localhost:55433`; migration and P0 rollback test passed | PASS | `initdb`, `pg_ctl`, `pg_isready`, migration output |
| DB-02 | RAB PostgreSQL integration | committed RAB workflow and audit | DRAFT → REVIEW → DRAFT → FINAL → revision persisted with audit | PASS | `tests/integration/postgres-rab-workflow.test.ts` |
| DB-03 | RAB rollback | failed transaction leaves no RAB row | forced failure rolled back | PASS | `tests/integration/postgres-rab-workflow.test.ts` |
| DB-04 | Official AHSP vertical slice | stable `hsp_id → ahsp_id → component_id → resource_id`, REVIEW, FINAL, reload | calculated item `44`, persisted and reloaded | PASS | `tests/integration/postgres-rab-workflow.test.ts` |
| DB-05 | Master validation | missing, literal zero, ambiguous mapping, incompatible unit block REVIEW; confirmed zero warns | canonical engine validation evidence preserved | PASS | `tests/integration/postgres-rab-workflow.test.ts` |
| DB-06 | Snapshot immutability | live base-price update cannot change REVIEW/FINAL calculation snapshot | snapshot unchanged after price becomes `9999` | PASS | `tests/integration/postgres-rab-workflow.test.ts` |
| REG-P0 | PostgreSQL project regression | P0 DB integration green | 6 tests passed | PASS | full `pnpm test` |
| REG-P1-Golden | Golden reference | existing oracle green | passed | PASS | full `pnpm test` |
| REG-P1-Contract | Contract-derived | existing acceptance green | passed | PASS | full `pnpm test` |

## 5. Quality evidence

| Gate | Actual |
|---|---|
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm build` | PASS |
| `pnpm boundaries` | PASS |
| `pnpm test` with `TEST_DATABASE_URL` | PASS — 14 files, 64 tests |
| `pnpm db:check` with `DATABASE_URL` | PASS |

## 6. Architecture checklist

- Domain does not import React, Next.js, Drizzle, PostgreSQL, or P1 engine: PASS.
- P1 engine remains pure and is called only by Application: PASS.
- Application does not import delivery/UI: PASS.
- UI direct database mutation: no new mutation added.
- Repository ports/adapters for RAB: PASS for RAB version source/snapshot persistence.
- Explicit RAB transaction and audit boundary: PASS for lifecycle writes.
- AI RAB controlled tools and AI-off integrated proof: **not implemented**.

## 7. Known limitations and blockers

1. The temporary PostgreSQL 15 runtime is a test-only local cluster at `/private/tmp/consultant-ai-office-pg15`, not a managed development service.
2. Exporter, PDF, UX, Phase 2–5, custom AHSP editor, arbitrary BV scripting, and all other deferred scope remain unimplemented.

## 8. Changed files

- `packages/domain/src/rab.ts`
- `packages/domain/src/index.ts`
- `packages/application/src/rab-workflow.ts`
- `packages/application/src/rab-ports.ts`
- `packages/application/src/index.ts`
- `packages/infrastructure/src/postgres/{schema,rab-workflow}.ts`
- `packages/infrastructure/src/index.ts`
- `packages/infrastructure/migrations/{0002_rab_workflow.sql,meta/_journal.json}`
- `packages/infrastructure/migrations/0003_master_snapshots.sql`
- `tests/unit/rab-workflow.test.ts`
- `tests/integration/postgres-rab-workflow.test.ts`
- `vitest.config.ts`
- `docs/implementation/handoffs/P0-P1-INTEGRATION.md`

## 9. Commit hash

Integration implementation commit: `0b6708173883c5ea144cb204586a5b453cbae6f8`.

## Final recommendation

**READY FOR UX IMPLEMENTATION**
