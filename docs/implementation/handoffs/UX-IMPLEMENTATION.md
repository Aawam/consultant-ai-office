# UX Implementation Handoff — Phase 0–1

**Workstream:** UX Implementation Engineer
**Status:** READY FOR EXCEL EXPORTER

## 1. Authority and baseline

- Read `AGENTS.md` and `docs/canonical/03-README.md`.
- UX authority: `docs/implementation/ux/UX_STRUCTURE_PHASE_0_1.md`, status **Ready for Implementation**. The requested filename `UX-STRUCTURE-P0-P1.md` is not present; the repository's canonical UX artifact uses the underscore filename above.
- P0 baseline: `c13baf0` / handoff `P0-FOUNDATION.md`.
- P1 baseline: `bf03fe4`, `1103f29`, `3908ee0` / handoff `P1-CORE-GOLDEN.md`.
- Integration baseline: `0b67081`, `8ad8624` / handoff `P0-P1-INTEGRATION.md`.

No business rule, calculation formula, lifecycle semantic, or persistence contract was changed.

## 2. Routes and screens

- `/` remains the single Phase 0–1 delivery route.
- Global navigation: Overview, RAB / EE, Review / Export, Activity.
- Overview: project preview, application context, AI-disabled assistant state, and controlled-use-case boundary.
- RAB / EE: hierarchy shell, source-path presentation for Official AHSP, Backup Volume, Direct Volume, and MANUAL/NON-AHSP, deterministic-result boundary, lifecycle preview.
- Review / Export: DRAFT → REVIEW → FINAL timeline, validation findings, role-aware controls, and separate Working/Official export states.
- Activity: empty/history boundary for `GetActiveProjectHistoryUseCase`.

## 3. Implemented components and contracts

- `OfficeWorkspace`: client interaction state for workspace, presentation role, lifecycle presentation, and feedback.
- `ProjectPanel`: real server-side `previewProjectCreation` integration; no mutation.
- `RabWorkspace`: GROUP → optional SUBGROUP → ITEM structure and source-path presentation.
- `ReviewWorkspace`: ERROR/WARNING/INFO presentation, lock state, warning confirmation boundary, return/revision controls.
- `ExportPanel`: distinct Working Export (`NOT OFFICIAL`) and Official Export states.
- `ActivityWorkspace`: empty state without invented audit records.
- Persistent context header exposes project, RAB version placeholder, lifecycle, AI state, and data-authority labels.

## 4. Application use cases integrated

### Composition root

Location: `packages/office-runtime/src/index.ts`, published as `@consultant-ai-office/office-runtime`.

Dependency graph:

```text
office-web
  → office-runtime (server-side facade)
    → application use cases
      → application ports
        → infrastructure PostgreSQL adapters
          → pg/PostgreSQL
```

`createOfficeRuntime()` constructs one pool, project adapters, RAB adapters, master-data snapshot adapter, clock, ID generator, project use cases, and RAB lifecycle use cases. It contains no business rules. `office-web` does not import Infrastructure, Drizzle, or PostgreSQL.

| Use case | Actual | Evidence |
|---|---|---|
| `previewProjectCreation` | Integrated on `/` | `apps/office-web/app/page.tsx` |
| `SelectActiveProjectUseCase` | Constructed by `office-runtime` | `packages/office-runtime/src/index.ts` |
| RAB draft/review/final/revision use cases | Constructed by `office-runtime` | `packages/office-runtime/src/index.ts` |
| `GetActiveProjectHistoryUseCase` | Constructed by `office-runtime` | `packages/office-runtime/src/index.ts` |
| `createProjectDeliveryFromRuntime` | Delivery uses `runtime.projects.create` | `apps/office-web/app/project-delivery.ts` |

The UI does not import Infrastructure, Drizzle, PostgreSQL, or perform direct persistence. Buttons for unavailable operations report the missing composition boundary instead of claiming success.

## 5. UX coverage

- Lifecycle: DRAFT, REVIEW, FINAL labels and lock/immutable messaging are present. No persisted APPROVED state was added.
- Role UX: TECHNICAL and ADMIN presentation modes expose/disable controls according to the UX structure; Application authorization remains authoritative.
- Validation: ERROR, WARNING, INFO, and SUCCESS have text labels, reason/consequence copy, and required-action copy; meaning is not color-only.
- Direct Volume: visibly separated exception path with required volume/unit/basis/provenance/notes language.
- MANUAL/NON-AHSP: visibly separated exception path with manual HSP/provenance language and no fake component breakdown or second OH/profit calculation.
- Data distinction: SAVED PROJECT DATA, DETERMINISTIC RESULT, and AI SUGGESTION labels are explicit.
- AI: disabled state is explicit; AI is not presented as calculator, approver, finalizer, or silent writer.
- Export: Working Export is marked `NOT OFFICIAL`; Official Export is restricted in presentation to ADMIN + FINAL and honestly marked unavailable.
- Loading/error/success/empty: empty, validation error, success preview, and disabled/loading-equivalent boundaries are represented.
- Accessibility: semantic labels, native controls, keyboard-focusable buttons, visible focus outline, `role="status"`/`role="alert"`, and non-color severity labels are implemented.

## 6. Test matrix

| Test ID | Area | Expected | Actual | Result | Evidence |
|---|---|---|---|---|---|
| UX-CTX-01 | Project preview | Domain preview visible without mutation | Existing preview remains functional | PASS | `page.tsx`; typecheck/build |
| UX-CTX-02 | Project selection | Context switch uses Application use case | Runtime exposes `SelectActiveProjectUseCase` | PASS | `office-runtime` composition |
| UX-LIFE-01 | Lifecycle | DRAFT/REVIEW/FINAL presentation distinct | Timeline, lock, immutable/revision copy present | PASS | `office-workspace.tsx` |
| UX-ROLE-01 | Role UX | TECHNICAL/ADMIN action presentation | Controls are role/status-aware | PASS | `office-workspace.tsx` |
| UX-VAL-01 | Validation | Severity and consequence visible | ERROR/WARNING/INFO/SUCCESS labels and copy present | PASS | `office-workspace.tsx` |
| UX-DATA-01 | Data authority | Saved/result/AI layers distinguishable | Explicit labels present | PASS | `office-workspace.tsx` |
| UX-EXPORT-01 | Export | Working vs Official restrictions visible | Separate panels and honest unavailable state | PASS | `office-workspace.tsx` |
| UX-A11Y-01 | Accessibility | Native controls and focus/semantic feedback | Implemented; browser/axe not executed | NOT EXECUTED | CSS and semantic markup review |
| REG-01 | Typecheck | All workspace packages pass | Passed with `corepack pnpm@11.24.0 typecheck` | PASS | command output |
| REG-02 | Lint/boundaries | Lint and dependency directions pass | Passed | PASS | `corepack pnpm@11.24.0 lint` |
| REG-03 | Unit/contract/integration tests | Existing tests remain green | 15 files / 73 tests passed | PASS | `TEST_DATABASE_URL=... corepack pnpm@11.24.0 test` |
| REG-04 | Production build | Next build succeeds | `/` compiled and generated | PASS | `corepack pnpm@11.24.0 build` |
| REG-05 | PostgreSQL integration | Migration, commit, rollback, P0/RAB/runtime persistence | Disposable PostgreSQL 15.13 on port 55434; migration applied; all integration tests passed | PASS | `TEST_DATABASE_URL=postgresql://awam@localhost:55434/postgres corepack pnpm@11.24.0 test` |

| RT-01 | Composition | Runtime assembles dependencies once | Project delivery persisted project and audit through composed runtime | PASS | `tests/integration/office-runtime-composition.test.ts` |
| RT-02 | RAB persistence | DRAFT → REVIEW → FINAL → revision survives reload | FINAL and revision persisted/reloaded through runtime | PASS | `tests/integration/office-runtime-composition.test.ts` |
| RT-03 | Authorization | Application remains security boundary | Invalid technical FINAL attempt rejected | PASS | `tests/integration/office-runtime-composition.test.ts` |
| RT-04 | Atomicity | Failed transaction rolls back | Existing RAB rollback integration passed | PASS | `tests/integration/postgres-rab-workflow.test.ts` |

## 7. Known limitations and blockers

1. The runtime composition root is now available, but the current page still exposes only the original project preview; wiring every browser mutation to server-side runtime handlers is a follow-up delivery slice.
2. Production Excel exporter is not implemented. No export success is faked.
3. The historical PostgreSQL cluster on port `55433` was not modified. Tests used a separate disposable PostgreSQL 15.13 cluster on port `55434`.
4. No browser/axe runtime test harness is configured in this repository.

## 8. Deferred functionality

Excel/PDF output implementation, Phase 2–5 features, arbitrary formula editing, custom AHSP administration, advanced dashboard analytics, multi-agent UI, and full branding remain deferred as required.

## 9. Changed files

- `apps/office-web/app/page.tsx`
- `apps/office-web/app/office-workspace.tsx`
- `apps/office-web/app/styles.css`
- `apps/office-web/app/project-delivery.ts`
- `apps/office-web/package.json`
- `packages/office-runtime/package.json`
- `packages/office-runtime/tsconfig.json`
- `packages/office-runtime/src/index.ts`
- `tests/integration/office-runtime-composition.test.ts`
- `scripts/check-boundaries.mjs`
- `vitest.config.ts`
- `pnpm-lock.yaml`
- `docs/implementation/handoffs/UX-IMPLEMENTATION.md`

## 10. Commit and recommendation

Implementation commit: `14f2bc2` (`feat: add application composition runtime`). The composition-root and integration gates are green. Excel exporter was not started.

**READY FOR EXCEL EXPORTER**
