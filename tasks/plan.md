# Implementation Plan: P1 Deterministic RAB/EE Core + Golden Test

## Overview

Implement the in-memory deterministic Phase 1 calculation boundary from the canonical Decision Log, AHSP normalization contract, Golden Test contract, and Manager closeout. The work is limited to the `rab-calculation-engine`, source-backed Golden fixtures/tests, separately labelled contract-derived fixtures/tests, and the required handoff.

## Source Audit Result

- Baseline commit `7305705569079cb2b8abc016c2d24f4086105fac` is an ancestor of the current repository state.
- D-023 and D-024 supersede the stale zero-policy sections in the Golden Test document.
- No unresolved canonical conflict blocks implementation.

## Architecture Decisions

- Preserve the bootstrap `decimal.js` strategy: critical values enter as decimal text or bigint, never native JavaScript `number`.
- Return canonical decimal strings from the engine; database, Excel, and UI representations remain outside the core.
- Model only pure calculation inputs/results and review-validation data required by P1 tests.
- Represent Golden BV evidence with the six controlled semantic operations named by the Golden contract; do not add an expression parser or arbitrary formula engine.
- Keep Golden Reference and CONTRACT-DERIVED fixtures/tests physically and semantically separate.

## Task List

### Phase 1: Oracle and public contracts

- [x] Add source-backed GT-01 through GT-12 fixtures and failing Golden tests.
- [x] Add labelled CONTRACT-DERIVED fixtures and failing validation/calculation tests.

### Checkpoint: RED

- [x] Target tests fail because the P1 calculation/validation API is not implemented.

### Phase 2: Deterministic calculation slices

- [x] Implement controlled BV operations and exact decimal primitives.
- [x] Implement component, AHSP/HSP, manual HSP, item, subgroup, group, PPN, and final rounding calculations.
- [x] Implement contract-required review validation and conservative unit normalization.

### Checkpoint: GREEN

- [x] Golden tests pass without changing their oracle.
- [x] Contract-derived tests pass and repeatability is exact.

### Phase 3: Quality and handoff

- [x] Verify engine purity and package boundaries.
- [x] Run lint, typecheck, test, build, and boundaries on the final change.
- [x] Write `docs/implementation/handoffs/P1-CORE-GOLDEN.md` with actual evidence and recommendation.
- [x] Commit the verified implementation and handoff with traceable hashes.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Native `number` leaks into critical arithmetic | Critical | Runtime decimal-text boundary plus regression tests |
| Legacy Excel rounding becomes business behavior | Critical | GT-07 and GT-11 assert full precision and one final half-up rounding |
| Synthetic data is mislabeled Golden | High | Separate fixture roots and explicit `CONTRACT-DERIVED` labels |
| Missing/zero prices are conflated | High | Enforce `MISSING / SET / ZERO_CONFIRMED` semantics |
| Unit aliases create implicit conversion | High | SAFE_ALIAS-only canonicalization and incompatibility errors |
| General formula engine expands scope | High | Closed discriminated union of six Golden BV operations |

## Open Questions

None. D-023/D-024 resolve the only stale Golden-spec policy gaps relevant to this workstream.
