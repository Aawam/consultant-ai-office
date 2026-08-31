# P0–P1 Integration Preparation — Handoff Delta

**Status:** EVIDENCE DELTA ONLY — not a P0–P1 gate acceptance.

**Scope boundary:** validated RAB snapshot → Application export boundary → Phase 1A technical working Excel (`NOT OFFICIAL`). No domain rule, lifecycle, authorization rule, calculation formula, PDF, Phase 2 capability, or official/final exporter was added or changed.

The working-output prerequisite is recorded as **APPROVED FOR PHASE 1A TECHNICAL WORKING OUTPUT** in [EXCEL-EXPORTER-PHASE-1A.md](EXCEL-EXPORTER-PHASE-1A.md). That approval remains distinct from official/final exporter acceptance.

## Evidence locations

| Concern | Evidence location | Actual result |
|---|---|---|
| Canonical authority and existing P0–P1 scope | [P0-P1-INTEGRATION.md](P0-P1-INTEGRATION.md), [03-README.md](../../canonical/03-README.md) | Existing P0/P1 lifecycle, snapshot, transaction, audit, and calculation contracts reused unchanged. |
| Phase 1A working workbook | [GT-07-GT-09-working.xlsx](../../../outputs/phase-1a-golden/GT-07-GT-09-working.xlsx), [EXCEL-EXPORTER-PHASE-1A.md](EXCEL-EXPORTER-PHASE-1A.md) | Approved technical working output; visibly `NOT OFFICIAL`. |
| Frontend request carries active IDs | [office-workspace.tsx](../../../apps/office-web/app/office-workspace.tsx) `ExportPanel` | WORKING request includes `action`, `projectId`, `rabVersionId`, and `exportType`; missing context is rejected before the request. |
| Delivery → runtime → Application export | [route.ts](../../../apps/office-web/app/api/workflow/route.ts), [index.ts](../../../packages/office-runtime/src/index.ts), [rab-export.ts](../../../packages/application/src/rab-export.ts) | Delivery calls the composed runtime; runtime injects `ExportRabExcelUseCase`; Application owns authorization, project-context checks, bound-snapshot selection, and artifact persistence. |
| Persisted snapshot → real workbook | [rab-workflow.ts](../../../packages/application/src/rab-workflow.ts), [excel-exporter.ts](../../../packages/infrastructure/src/excel-exporter.ts), [postgres/artifacts.ts](../../../packages/infrastructure/src/postgres/artifacts.ts) | REVIEW binds `calculationSnapshot.exportSnapshot`; the real ExcelJS exporter receives that snapshot and labels WORKING output `NOT OFFICIAL`. |
| Real PostgreSQL delivery slice | [office-workflow-delivery.test.ts](../../../tests/integration/office-workflow-delivery.test.ts) | `Project → DRAFT → REVIEW → export_excel` returned WORKING XLSX; artifact `snapshotId` equalled the persisted REVIEW `exportSnapshot.snapshotId`. |
| No partial output on persistence failure | [postgres-export-artifact.test.ts](../../../tests/integration/postgres-export-artifact.test.ts), [postgres/artifacts.ts](../../../packages/infrastructure/src/postgres/artifacts.ts) | Forced PostgreSQL insert failure removes the already-written WORKING `.xlsx`; the failure directory is empty. |
| Versioned mock fixture | [phase-1a-working-output.fixture.ts](../../../tests/fixtures/phase-1a-working-output.fixture.ts), [mock-working-exporter.test.ts](../../../tests/export/mock-working-exporter.test.ts) | Fixture is `phase-1a-working-output-v1`, explicitly contract-derived and not Golden. The adapter rejects `OFFICIAL`. |
| Controlled tool through Application | [project-tools.ts](../../../packages/ai-agent/src/project-tools.ts), [ai-project-write.test.ts](../../../tests/approval-policy/ai-project-write.test.ts) | `create_project` requires human confirmation and delegates to `CreateProjectUseCase`; the test proves one transaction and a successful audit record. |
| Approval/write and audit/activity persistence | [postgres-rab-workflow.test.ts](../../../tests/integration/postgres-rab-workflow.test.ts), [project-history.ts](../../../packages/application/src/project-history.ts) | ADMIN FINAL and RAB lifecycle audit rows are covered by PostgreSQL integration tests; project-history read use case remains Application-owned. |
| Basic delivery error handling | [route.ts](../../../apps/office-web/app/api/workflow/route.ts), [office-workflow-delivery.test.ts](../../../tests/integration/office-workflow-delivery.test.ts) | Delivery maps expected errors to 403/404/422; an invalid request returns `VALIDATION_ERROR` and does not report REVIEW success. |

## Confirmed end-to-end boundary

```text
OfficeWorkspace ExportPanel
  → POST /api/workflow { action, projectId, rabVersionId, exportType: WORKING }
  → OfficeRuntime composition
  → ExportRabExcelUseCase (Application)
  → bound RabVersion.calculationSnapshot.exportSnapshot
  → ExcelJsRabWorkbookExporter (Infrastructure)
  → PostgresArtifactStorage + working .xlsx response
```

The calculation path is unchanged: `SubmitRabForReviewUseCase` calls the existing pure P1 engine and persists its result/snapshot before export. `ExportRabExcelUseCase` does not calculate or reread live master data; for REVIEW it requires and forwards the bound snapshot.

The delivery test uses `ExcelJsRabWorkbookExporter` and PostgreSQL—not the mock. The mock is injectable only for controlled fixture tests, has an explicit fixture version, and refuses OFFICIAL output. Therefore no acceptance claim rests on a mock-only path.

## Request/response contract state

The working export boundary currently accepts:

```json
{ "action": "export_excel", "projectId": "uuid", "rabVersionId": "uuid", "exportType": "WORKING" }
```

It returns `{ ok, data: { artifact, bytesBase64 } }`; `artifact.snapshotId` is the traceability link to the bound calculation snapshot. The internal TypeScript port is `RabWorkbookExportInput` / `ExportRabResponse`.

`fixtureVersion` exists for the test-only mock fixture. The HTTP request/response itself has **no explicit contract-version field or versioned schema document**.

## Current regression evidence

Executed 2026-08-31 against PostgreSQL at `localhost:55434` after applying the existing migration set:

| Command | Actual |
|---|---|
| `corepack pnpm@11.24.0 lint` | PASS |
| `corepack pnpm@11.24.0 typecheck` | PASS |
| `corepack pnpm@11.24.0 boundaries` | PASS |
| `DATABASE_URL=… corepack pnpm@11.24.0 db:check` | PASS |
| `TEST_DATABASE_URL=… corepack pnpm@11.24.0 test` | PASS — 22 files, 87 tests |
| `corepack pnpm@11.24.0 build` | PASS |
| Targeted PostgreSQL evidence | PASS — 3 files, 6 tests: delivery snapshot/export, artifact rollback, versioned mock |

## EVIDENCE GAP

1. **Actual browser UI success/failure:** no browser-E2E runner or Chrome DevTools connection is configured in this workspace. The current proof invokes the real Next delivery route, runtime, PostgreSQL, and ExcelJS exporter, but does not click the rendered browser controls or capture a browser download/error notice.
2. **Activity UI:** `GetActiveProjectHistoryUseCase` and its persistence evidence exist, but `ActivityWorkspace` is still a presentation placeholder and has no live history fetch/render proof.
3. **HTTP contract versioning:** the route payload has TypeScript implementation types but no explicit wire-level `contractVersion` field/schema. The fixture version is not a substitute for API contract versioning.
4. **Reproducible e2e artifact retention:** integration tests clean database state and runtime artifacts are local/ignored. The approved Golden working workbook above is a preserved output artifact; there is not yet a separately retained artifact tied to the delivery integration test run.

These are evidence gaps only. This delta intentionally does not reimplement UI activity, browser automation, or a versioned HTTP API.

## Changed files in this preparation delta

- `apps/office-web/app/office-workspace.tsx`
- `packages/office-runtime/src/index.ts`
- `packages/infrastructure/src/{index.ts,mock-working-exporter.ts,postgres/artifacts.ts}`
- `tests/integration/{office-workflow-delivery.test.ts,postgres-export-artifact.test.ts}`
- `tests/export/mock-working-exporter.test.ts`
- `tests/fixtures/phase-1a-working-output.fixture.ts`
- `docs/implementation/handoffs/P0-P1-INTEGRATION-PREPARATION.md`
