# Excel Exporter — Phase 1A Golden Output Validation

Status: **APPROVED FOR PHASE 1A TECHNICAL WORKING OUTPUT**

The automated golden-output checks are green and civil technical sign-off has been recorded. This approval is limited to Phase 1A technical working output and does not declare official or final exporter acceptance.

Presentation-correction implementation commit: `8aacaf861e0adf4cd3bb971bfdda02acc476c367`.

## Golden input and authority

One official source-backed context was used:

| Context | Authoritative fixture | Source-backed values |
|---|---|---|
| GT-07 | `fixtures/golden-reference/rab-ee-golden.ts` | AHSP `1.2.1.1.1`, edition `SE Dirjen Bina Konstruksi 47/SE/Dk/2026`, labor prices `176000` and `206000`, OH/profit `10%`, expected HSP `153810.8` |
| GT-09 | `fixtures/golden-reference/rab-ee-golden.ts` | seven BV child volumes, expected volume `74.3535`, PPN `11%`, expected final total `12694000` |

The canonical Excel contract is [docs/canonical/12-excel-output-contract.md](../../canonical/12-excel-output-contract.md). The preceding implementation decision record is [docs/implementation/handoffs/EXCEL-EXPORTER.md](EXCEL-EXPORTER.md). The fixture is explicitly labelled source-backed and is not synthetic data promoted to golden status.

## Generated evidence

- [GT-07-GT-09-working.xlsx](../../../outputs/phase-1a-golden/GT-07-GT-09-working.xlsx) — generated working workbook, label `NOT OFFICIAL`, snapshot `golden-snapshot-gt07-gt09-v1`.
- [GT-07-GT-09-comparison.json](../../../outputs/phase-1a-golden/GT-07-GT-09-comparison.json) — machine-readable comparison and formula-error scan.
- [VISUAL-PARITY-REVIEW.md](../../../outputs/phase-1a-golden/VISUAL-PARITY-REVIEW.md) — side-by-side source/candidate inspection and intentional-deviation register.
- Visual inspection: [REKAP](../../../outputs/phase-1a-golden/visual-inspection/rekap.png), [RAB](../../../outputs/phase-1a-golden/visual-inspection/rab.png), [BV](../../../outputs/phase-1a-golden/visual-inspection/bv.png), [ANALISA HSP](../../../outputs/phase-1a-golden/visual-inspection/analisa-hsp.png), and [HARGA DASAR](../../../outputs/phase-1a-golden/visual-inspection/harga-dasar.png).

## Phase 1A presentation correction

The workbook now presents five civil-review sheets in source-workbook order and visual language: `REKAP`, `RAB`, `BV`, `ANALISA HSP`, and `HARGA DASAR`. Titles, project context, grey table headings, grouped RAB rows, BV dimension columns, AHSP component calculation, and Indonesian number presentation follow the approved source pattern without copying its external links, macro behavior, stale formulas, or formula errors.

Raw project, RAB, snapshot, item, HSP, AHSP component, resource, BV-line, parent, and reference identifiers are absent from user-visible sheets. They remain auditable in four `veryHidden` protected metadata sheets: `PROJECT`, `AHSP_COMPONENTS`, `HSP_MAPPING`, and `CHECKS`. Formula presentation follows the source audit chain directly: `BV → RAB → REKAP` and `HARGA DASAR → ANALISA HSP → RAB`.

Automated comparison:

| Assertion | Expected | Actual | Result |
|---|---:|---:|---|
| GT-07 HSP | `153810.8` | `153810.8` | PASS |
| GT-09 BV volume | `74.3535` | `74.3535` | PASS |
| GT-09 item value | `11436371.3178` | `11436371.3178` | PASS |
| PPN | `1258000.844958` | `1258000.844958` | PASS |
| Before rounding | `12694372.162758` | `12694372.162758` | PASS |
| Grand total after HALF_UP thousand rounding | `12694000` | `12694000` | PASS |
| Rounding difference | `-372.162758` | `-372.162758` | PASS |
| Formula error scan | no `#REF!`, `#DIV/0!`, `#VALUE!`, `#NAME?` | none found | PASS |
| External links | absent | absent | PASS |
| VBA/macros | absent | absent | PASS |
| Raw technical IDs on visible sheets | absent | absent | PASS |
| Visual inspection of all visible sheets | legible/source-aligned | five rendered sheets inspected | PASS |

## Human technical review

**APPROVED — CIVIL TECHNICAL VALIDATOR SIGN-OFF RECEIVED**

The workbook contents were reviewed for item identity, volume/BV traceability, AHSP/resource/base-price identity, HSP calculation, subtotal, OH/profit, PPN, rounding, and grand total.

### Civil technical sign-off

| Recorded at (local) | Validator | Role | Decision | Material discrepancy |
|---|---|---|---|---|
| 2026-08-31 20:48:06 WITA | Atmin Awam | Atmin / Pemilik Project dan validator teknis sipil | APPROVED | None reported |

Golden reference and price context: sesuai paket GT-07/GT-09 yang telah direview pemilik.

This sign-off applies only to **APPROVED FOR PHASE 1A TECHNICAL WORKING OUTPUT**. It is not official/final export acceptance.

## Current regression evidence

Executed against the current working tree:

```text
corepack pnpm@11.24.0 lint                         PASS
corepack pnpm@11.24.0 typecheck                    PASS
TEST_DATABASE_URL=... corepack pnpm@11.24.0 test   PASS — 22 files, 86 tests
corepack pnpm@11.24.0 build                        PASS
```

The integration run used a disposable local PostgreSQL database with the current migrations. No production database was used.

## Scope delta and deferred work

This delta adds golden-output generation/evidence and preserves snapshot identity through the BV parent/reference columns. Official/final acceptance, live-master mutation proof, full GT-01–GT-12 workbook coverage, and the full EXP matrix remain deferred to the official-exporter gate. No Phase 2–5 capability is introduced.

Phase 1A technical working output is approved based on the recorded sign-off. Official/final acceptance, live-master mutation proof, full GT-01–GT-12 workbook coverage, and the full EXP matrix remain deferred to the official-exporter gate.
