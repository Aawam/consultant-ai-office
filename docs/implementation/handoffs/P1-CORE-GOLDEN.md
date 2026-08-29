# P1 — Deterministic RAB/EE Core + Golden Test Handoff

**Workstream:** P1 — Deterministic RAB/EE Core + Golden Test

**Baseline repository:** `7305705569079cb2b8abc016c2d24f4086105fac`

**Authority:** Decision Log D-001–D-025; `08-rab-ee-baseline-v1.md`; `10-AHSP-normalization-spec.md`; `11-golden-test-spec.md`; `13-manager-integration-closeout.md`

**Recommendation:** **READY FOR P0-P1 INTEGRATION**

This handoff does not declare Phase 1 `ACCEPTED` or `FINAL`.

## Implemented Calculation Scope

- Controlled, whitelisted BV operations required by GT-01–GT-05: `GEOMETRY_PRODUCT`, `WEIGHTED_COUNT`, `REFERENCE_FACTOR`, `REBAR_ROUNDUP`, `SEGMENT_SUM_FACTOR`, and `SUM_CHILDREN`.
- Component cost: coefficient × base price.
- AHSP subtotals A (labor), B (material), C (equipment), D = A+B+C, E = D×project OH/profit, and official HSP = D+E.
- MANUAL/NON-AHSP final HSP used as-is, with no second OH/profit application.
- Item value, subgroup subtotal, group subtotal, subtotal RAB, project PPN, `TotalBeforeRounding`, one final half-up Rp1.000 rounding, and rounding difference.
- Pre-REVIEW validation required by Golden/contract acceptance: D-023, D-024, direct-volume traceability, base-price state, intentional zero, conservative unit compatibility, unresolved/ambiguous component mapping, OH/profit rate, and PPN validity.

The engine is process-memory only. It has no web, React/Next.js, database, filesystem, Excel, AI-provider, or network dependency. A purity contract test enforces this boundary.

## Decimal Strategy

- Existing bootstrap strategy retained: `decimal.js` 10.6.0 with 40 significant digits and canonical non-exponential serialization.
- Critical inputs accept only decimal `string` or `bigint`; native JavaScript `number` is rejected at runtime.
- Intermediate HSP/RAB values are not business-rounded. The configured decimal precision is representation precision, not authorization for intermediate currency rounding.
- Exact source ratios can enter controlled BV operations as numerator/denominator pairs; GT-05 retains `8/3` rather than replacing it with a binary float.
- The sole monetary business rounding is `floor((TotalBeforeRounding + 500) / 1000) × 1000` for nonnegative totals.

## Golden Reference — Expected vs Actual

Golden data remains in `fixtures/golden-reference/`; no synthetic fixture is labelled Golden Reference.

| Case | Canonical expected | Engine actual | Result |
|---|---|---|---|
| GT-01 | `384.0 m2` | `384` | PASS — same decimal value |
| GT-02 | `57.600 m3` | `57.6` | PASS — same decimal value |
| GT-03 | count `72`; length `864 m` | count `72`; length `864` | PASS |
| GT-04 | rebar `45.32199750 kg`; concrete `0.36 m3`; formwork `2.4 m2` | `45.3219975`; `0.36`; `2.4` | PASS |
| GT-05 | exact `337/12 m`; tolerance `1e-12` | `28.08333333333333333333333333333333333334` | PASS |
| GT-06 | HSP `1,963,999.461693121693121...` | `1963999.461693121693121693121693121693122` | PASS |
| GT-07 | precise HSP `153810.8`; legacy header `153800` rejected | `153810.8` | PASS — EXPLAINED DIFFERENCE |
| GT-08 | subgroup `2331845.7061315350553935525` | `2331845.7061315350553935525` | PASS — EXPLAINED DIFFERENCE |
| GT-09 | item `11436371.3178`; PPN `1258000.844958`; pre-round `12694372.162758`; final `12694000` | exact match for all four values | PASS — EXPLAINED DIFFERENCE |
| GT-10 | subtotal `3052495468.927971114090667112125313795`; PPN `335774501.58207682254997338233378451745`; pre-round `3388269970.51004793664064049445909831245`; final `3388270000` | exact match for all four values | PASS — EXPLAINED DIFFERENCE |
| GT-11A/B/C | `3561222000`; `385245000`; `1450300000` | exact match | PASS |
| GT-12 | numeric `1701000`; `ERROR`; REVIEW blocked | `1701000`; `DIRECT_VOLUME_TRACEABILITY_MISSING`; blocked | PASS — EXPECTED ERROR |

The GT-07–GT-10 labels preserve the canonical source classification. The engine matches the canonical contract; the explained difference is against legacy workbook behavior/structure, not against the oracle.

## Contract-Derived Acceptance Tests

Synthetic fixtures are isolated in `fixtures/contract-derived/` and explicitly labelled `CONTRACT-DERIVED — NOT GOLDEN REFERENCE`.

| Contract case | Expected result | Actual result |
|---|---|---|
| Valid direct volume with basis/source/note/reviewer | WARNING; non-blocking | PASS |
| Valid MANUAL/NON-AHSP HSP | WARNING; final HSP unchanged; no double OH | PASS |
| Valid `ZERO_CONFIRMED` | zero component cost; WARNING; non-blocking | PASS |
| D-023 zero volume | ERROR; REVIEW blocked | PASS |
| D-024 zero manual HSP | ERROR; REVIEW blocked | PASS |
| Missing base price | ERROR; REVIEW blocked | PASS |
| Literal unresolved zero | ERROR; not promoted to `ZERO_CONFIRMED` | PASS |
| Component/base-price incompatible unit | ERROR | PASS |
| RAB volume/HSP incompatible unit | ERROR | PASS |
| `REVIEW_REQUIRED` unit token | ERROR; no silent coercion | PASS |
| Ambiguous component mapping | ERROR; no best guess | PASS |
| Direct item + subgroup aggregation | counted exactly once in supplied partition | PASS |

## Deterministic Repeatability

One valid MANUAL/NON-AHSP → item → project-total calculation was executed 100 times in the same process. Every run produced a byte-identical canonical JSON result.

**Result:** PASS.

## Quality Gates

| Gate | Result | Current evidence |
|---|---|---|
| `pnpm lint` | PASS | zero warnings; boundaries valid for 7 workspace modules |
| `pnpm typecheck` | PASS | all 7 applicable workspace packages completed |
| `pnpm test` | PASS | 12 test files; 55 tests passed; no skipped/disabled tests |
| `pnpm build` | PASS | Next.js production build compiled and generated static routes |
| `pnpm boundaries` | PASS | 7 workspace module boundaries valid |

The PostgreSQL integration test belongs to P0, but is part of the repository-wide `pnpm test`. It was executed against the isolated local database `consultant_ai_office_test`; the P1 engine did not connect to it.

## Differences

### Explained

- GT-07 uses precise `153810.8`, not the legacy `ROUNDDOWN` header `153800`.
- GT-08 calculates the canonical subgroup subtotal absent from the legacy parent row.
- GT-09 uses the current canonical HSP instead of stale external workbook `[2]` data.
- GT-10 uses half-up logic; the legacy workbook's `ROUNDUP` happens to return the same final value only for this input.

### Unexplained

None.

## Known Limitations

- This slice does not implement UI, Excel/PDF export, persistence, AI calculation, RKS, or Phase 2–5.
- Project snapshot/revision/status orchestration remains an Application Layer responsibility; this package provides pure calculation and pre-REVIEW validation primitives only.
- Group calculation accepts an already partitioned set of direct items and subgroup subtotals. Ownership/persistence constraints that prevent the same item being assigned to two containers remain outside this calculation-only slice.
- Per-record AHSP normalization anomalies remain blocked until resolved; the engine deliberately provides no best-guess mapper.
- Repeating rational values serialize at the locked 40-digit decimal precision and are assessed with the canonical Golden tolerance.

## Changed Files

- `packages/rab-calculation-engine/src/{index,decimal,types,units,bv,calculations,validation}.ts`
- `fixtures/golden-reference/rab-ee-golden.ts`
- `fixtures/contract-derived/rab-ee-contract.ts`
- `tests/golden-reference/rab-ee-golden.test.ts`
- `tests/contract-derived/rab-ee-contract.test.ts`
- `tests/contracts/rab-engine-purity.test.ts`
- `tasks/plan.md`
- `tasks/todo.md`
- `docs/implementation/handoffs/P1-CORE-GOLDEN.md`

No UI, exporter, persistence schema, PDF, AI-provider integration, or later-phase file was added by P1.

## Commits

- Core implementation: `1103f29ec7f175fecf2eaeb5e31ba6a5af487520`
- Golden/contract fixtures and tests: `3908ee0fdb6c9493fbb18954236957070381b270`

The checkout was shared with the P0 workstream, so P0 commits are interleaved in branch history. The P1 commits above are file-scoped and independently reviewable.

## Final Recommendation

**READY FOR P0-P1 INTEGRATION**
