# P1 Excel Exporter Checklist

## Task 1: Application export boundary

**Acceptance criteria:**

- [x] Working export permits TECHNICAL/ADMIN only for DRAFT/REVIEW.
- [x] Official export permits ADMIN only for FINAL.
- [x] FINAL export uses persisted snapshot and does not read live master data.

**Verification:** `pnpm test -- tests/export/excel-export.test.ts`

**Dependencies:** None

## Task 2: Workbook generator

**Acceptance criteria:**

- [x] Required 9-sheet structure and stable tables exist.
- [x] Formula-active HSP, item, recap, PPN, and half-up rounding chain exists.
- [x] Workbook has no external links, macros, or fixed-row business dependencies.

**Verification:** `pnpm test -- tests/export/excel-workbook.test.ts`

**Dependencies:** Task 1

## Task 3: Browser delivery

**Acceptance criteria:**

- [x] Working and Official controls call the actual delivery route.
- [x] UI shows actual artifact success/failure and does not claim success when blocked.

**Verification:** `pnpm test -- tests/integration/office-workflow-delivery.test.ts`

**Dependencies:** Tasks 1–2

## Task 4: Evidence and gates

**Acceptance criteria:**

- [ ] EXP-01 through EXP-20 are fully covered; partial coverage and blockers are documented.
- [x] Handoff records actual command output, changed files, and known limitations.
- [x] Full regression gates pass.

**Verification:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm boundaries && pnpm db:check`

**Dependencies:** Tasks 1–3

## Task 5: Commit gate

**Acceptance criteria:**

- [ ] Only verified exporter implementation is committed.
- [ ] Recommendation is exactly one allowed Phase 1 exporter status.

**Verification:** clean review of git diff, command output, and handoff.

**Dependencies:** Tasks 1–4
