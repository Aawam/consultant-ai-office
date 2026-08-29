# P1 Deterministic RAB/EE Core Checklist

## Task 1: Golden oracle

**Acceptance criteria:**

- [x] GT-01 through GT-12 remain source-backed and cite canonical source locators.
- [x] Exact expected values, tolerances, and classifications are not altered to fit code.

**Verification:** `pnpm test -- tests/golden-reference/rab-ee-golden.test.ts`

**Dependencies:** None

## Task 2: Contract-derived acceptance

**Acceptance criteria:**

- [x] Valid direct volume, MANUAL/NON-AHSP, and ZERO_CONFIRMED are labelled `CONTRACT-DERIVED`.
- [x] D-023, D-024, missing price, unresolved zero, unit, and ambiguity paths are covered.

**Verification:** `pnpm test -- tests/contract-derived/rab-ee-contract.test.ts`

**Dependencies:** Task 1

## Task 3: Pure deterministic core

**Acceptance criteria:**

- [x] All requested calculation stages use canonical decimal arithmetic.
- [x] Native JavaScript numbers are rejected at critical boundaries.
- [x] Same valid input produces byte-identical canonical output repeatedly.

**Verification:** Golden, contract-derived, and decimal unit tests pass.

**Dependencies:** Tasks 1–2

## Task 4: Purity and scope guard

**Acceptance criteria:**

- [x] Calculation package has no forbidden web, database, filesystem, Excel, AI, or network dependency.
- [x] No UI, exporter, persistence schema, PDF, RKS, or later-phase feature is added.

**Verification:** `pnpm boundaries` and purity contract test.

**Dependencies:** Task 3

## Task 5: Full gates and handoff

**Acceptance criteria:**

- [x] `lint`, `typecheck`, `test`, `build`, and `boundaries` have current PASS evidence.
- [x] P1 handoff records scope, decimal strategy, GT matrix, contract tests, repeatability, differences, limitations, files, hash, and recommendation.

**Verification:** clean review of git diff, command output, and handoff.

**Dependencies:** Tasks 1–4
