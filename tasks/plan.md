# Implementation Plan: Phase 0 + Phase 1 Kickoff Bootstrap

## Overview

Bootstrap one local-first, server-ready modular monolith for the Phase 0 AI Office foundation and Phase 1 RAB/EE capability. This kickoff establishes enforceable boundaries, deterministic numeric infrastructure, PostgreSQL migrations, and green quality gates without implementing broad Phase 0 UI or Phase 1 business calculations.

## Source Audit Result

- Canonical precedence is usable and no unresolved contract conflict blocks bootstrap.
- D-023 and D-024 supersede stale zero-policy text in the Golden Test document.
- Jalur A, B, and C are final implementation contracts; reference binaries remain evidence/reference data only.

## Architecture Decisions

- Use a pnpm TypeScript workspace and one Next.js App Router application.
- Keep the six required packages as explicit workspace packages in one deployable modular monolith.
- Use PostgreSQL 17 locally and Drizzle's versioned `generate`/`migrate` workflow.
- Represent critical arithmetic with `decimal.js` in TypeScript and `numeric` in PostgreSQL; binary floating point is forbidden at critical RAB boundaries.
- Enforce package direction through declared workspace dependencies plus an executable boundary check.
- Keep AI optional and expose only controlled tool contracts targeting application use cases.

## Dependency Direction

```text
office-web ───────┐
ai-agent ─────────┼─> application ─> domain
                  │        └────────> rab-calculation-engine
infrastructure ───┘        └────────> shared-contracts

infrastructure implements application/domain ports.
No package may depend on office-web or ai-agent.
```

## Task List

### Phase 1: Repository foundation

- [x] Create Git, workspace, TypeScript, lint, test, and build configuration.
- [x] Add root rules, environment template, reference provenance, and scope documentation.

### Checkpoint: Foundation

- [x] Dependency installation succeeds.
- [x] Workspace discovery and boundary check succeed.

### Phase 2: Minimal executable slices

- [x] Add package entry points and controlled contracts with no broad business implementation.
- [x] Add deterministic decimal strategy proof and boundary tests.
- [x] Add Next.js shell and PostgreSQL/Drizzle migration skeleton.

### Checkpoint: Executable baseline

- [x] Lint and typecheck pass.
- [x] Unit/contract tests pass.
- [x] Production build passes.

### Phase 3: Documentation and handoff

- [x] Record technical decisions and implementation status.
- [x] Perform code-quality review and fix material findings.
- [ ] Commit the verified baseline and record the final commit hash in the handoff.

### Checkpoint: Ready

- [ ] Working tree is clean.
- [ ] Handoff contains actual command evidence and readiness verdict.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Package boundaries exist only on paper | High | Executable boundary script and workspace dependency allowlist |
| Binary floating-point leaks into RAB arithmetic | Critical | Decimal-only public calculation boundary and test evidence |
| Scaffold grows into premature business implementation | Medium | Only smoke behavior and contracts in this kickoff |
| Reference files become accidental rules | High | Hash manifest labels each file as non-authoritative reference data |
| Migration workflow drifts | Medium | Versioned SQL migration directory plus Drizzle config/commands |

## Open Questions

- Exact physical database schema and ID encoding remain future technical blueprint decisions.
- Minimum supported Microsoft Excel version remains deferred to the exporter blueprint.
- Per-record AHSP mapping anomalies remain data-resolution work when affected records are used.
