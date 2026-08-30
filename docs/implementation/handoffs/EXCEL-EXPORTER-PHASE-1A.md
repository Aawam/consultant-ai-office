# Excel Exporter — Phase 1A Golden Output Validation

Status: **NOT READY — GOLDEN OUTPUT VALIDATION REMAINS**

The automated golden-output checks are green. Phase 1A approval is still blocked until a civil-technical validator records a substantive review and sign-off. This document does not declare official or final exporter acceptance.

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

## Human technical review

**PENDING — CIVIL TECHNICAL VALIDATOR SIGN-OFF REQUIRED**

Validator must review the workbook contents and record name, role, date, and decision for item identity, volume/BV traceability, AHSP/resource/base-price identity, HSP calculation, subtotal, OH/profit, PPN, rounding, and grand total. No external validator identity or sign-off has been supplied in this repository, so none is asserted here.

## Current regression evidence

Executed against the current working tree:

```text
corepack pnpm@11.24.0 lint                         PASS
corepack pnpm@11.24.0 typecheck                    PASS
TEST_DATABASE_URL=... corepack pnpm@11.24.0 test   PASS — 20 files, 83 tests
corepack pnpm@11.24.0 build                        PASS
```

The integration run used a disposable local PostgreSQL database with the current migrations. No production database was used.

## Scope delta and deferred work

This delta adds golden-output generation/evidence and preserves snapshot identity through the BV parent/reference columns. Official/final acceptance, live-master mutation proof, full GT-01–GT-12 workbook coverage, and the full EXP matrix remain deferred to the official-exporter gate. No Phase 2–5 capability is introduced.

Re-review may be requested for **APPROVED FOR PHASE 1A TECHNICAL WORKING OUTPUT** only after the human technical sign-off is attached. That status is not official/final export acceptance.
