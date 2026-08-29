# Implementation Plan: P1 Excel Exporter

## Overview

Implement the production Phase 1 Excel exporter from the canonical Excel Output Contract. The exporter must remain behind Application Use Cases, use persisted RAB snapshots, produce formula-active self-contained workbooks, and expose separate Working/Official artifact flows.

## Source Audit Result

- P0, P1, integration, and UX handoffs authorize Excel exporter work.
- `12-excel-output-contract.md` is final for implementation and outranks reference workbook behavior.
- Existing RAB snapshots already carry deterministic calculation evidence; exporter must not recalculate business truth.

## Architecture Decisions

- Keep export authorization and lifecycle checks in Application Layer.
- Treat `RabVersion.calculationSnapshot` and persisted item/HSP snapshot data as the export source; never read live master data for FINAL.
- Build workbook structure with a focused XLSX library, Excel Tables, stable IDs, structured formulas, locked formula cells, and no links/macros.
- Persist artifacts through a port; official artifacts receive unique identity and are never overwritten.

## Task List

### Phase 1: Application and artifact contracts

- [ ] Add export request/result types, artifact port, and Application export use cases.
- [ ] Add project lookup-by-ID and artifact persistence adapter.

### Checkpoint: Contract RED

- [ ] Export authorization and artifact behavior tests fail before implementation.

### Phase 2: Workbook slice

- [ ] Implement self-contained 9-sheet workbook generator.
- [ ] Implement formula-active HSP/item/recap/rounding chains and traceability metadata.
- [ ] Implement locked review/final workbook behavior and checks.

### Checkpoint: Workbook GREEN

- [ ] Generated files parse successfully and contain required tables/formulas with no external links/macros.
- [ ] Numeric and reproducibility acceptance tests pass.

### Phase 3: Delivery and handoff

- [ ] Wire runtime, route, and UX controls to real Working/Official exports.
- [ ] Add EXP-01 through EXP-20 focused coverage where the current persisted model permits.
- [ ] Run required gates including `pnpm db:check` and write `docs/implementation/handoffs/EXCEL-EXPORTER.md`.
- [ ] Commit verified increments with traceable hashes.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Workbook formulas drift from P1 values | Critical | Snapshot values remain source authority; checks reconcile formula cells to snapshot totals |
| External links or fragile row references | Critical | Package inspection tests and structured-reference formulas only |
| Official artifact overwrite | High | Unique artifact ID/path and persistence tests |
| Missing persisted project metadata | Medium | Add read-only project lookup port; no UI state authority |

## Open Questions

The existing Phase 1 model does not yet persist a dedicated artifact row or snapshot-level project metadata; implementation will use the minimum adapter/port needed for local artifact traceability and document any deferred database hardening.
