# Implementation Status

**Updated:** 2026-08-29
**Phase:** Phase 0 + Phase 1 kickoff bootstrap
**Canonical conflict status:** none blocking

## Canonical audit verdict

- D-001 through D-025 reviewed.
- Jalur A/B/C contracts reviewed as final.
- D-023/D-024 resolve stale zero-policy text in Jalur B by explicit precedence.
- Remaining AHSP issues are per-record migration/data issues, not open semantic-contract blockers.

## BUILD NOW

- Local-first web shell and modular-monolith boundaries.
- Shared Application/Domain boundary for human and AI clients.
- Deterministic decimal infrastructure.
- Controlled AI tool registry with AI disabled by default.
- One PostgreSQL instance, migration skeleton, and project storage boundary.
- Test/lint/typecheck/build baseline.
- Later Phase 0/1 slices listed in the accepted Architecture Foundation.

## DESIGN FOR LATER

- Server deployment, remote access, object storage adapter.
- Provider switching, richer traces/retention, and scoped file/terminal adapters only if justified.
- Excel target version and exporter physical design.
- PDF adapter only after Excel validation.

## DO NOT BUILD YET

- Phase 2–5 capabilities.
- Multi-agent/subagent runtime, autonomous workers, or self-modifying skills.
- Microservices, Redis, vector DB, graph DB, message queue, Kubernetes.
- Arbitrary/custom BV expression engine.
- CAD/GIS automation, local LLM infrastructure, complex persistent memory.

## Implemented in this kickoff

- Repository/workspace/config foundation.
- Six required package boundaries and one web app.
- Decimal exactness proof and controlled tool registry proof.
- Minimal web shell.
- PostgreSQL Compose and Drizzle migration framework.
- Governance/provenance/technical decision documentation.

## Local environment audit

- Node.js 22.23.0 and Corepack are available.
- pnpm is pinned to 11.24.0 through `packageManager`; commands use the pinned version rather than the older global pnpm installation.
- Docker CLI and Compose are installed. Docker Desktop did not expose a running daemon during this kickoff, so Compose configuration is validated but the PostgreSQL container and migration were not falsely reported as executed.
- PostgreSQL runtime verification requires Docker Desktop to be running, followed by `pnpm db:up` and `pnpm db:migrate`.

## Explicitly not implemented

- RAB/EE formulas, validation matrix, entity schema, review transitions, Excel exporter.
- Project selector, chat UI, execution history UI, authentication.
- Any PDF, RKS, Document Engine, Project Control, or mature AI Office feature.

## Verified baseline evidence

Executed on 2026-08-29 against the current bootstrap state:

- `CI=true corepack pnpm@11.24.0 install --frozen-lockfile` — passed; all 8 workspace projects were already up to date.
- `corepack pnpm@11.24.0 lint` — passed; ESLint reported no warnings and boundaries were valid for 7 workspace modules.
- `corepack pnpm@11.24.0 typecheck` — passed for all 7 source workspaces.
- `corepack pnpm@11.24.0 test` — passed; 4 files and 8 tests.
- `corepack pnpm@11.24.0 build` — passed; Next.js production output contains static `/` and `/_not-found` routes.
- `corepack pnpm@11.24.0 db:check` — passed; Drizzle reported the migration history consistent.
- `docker compose config --quiet` — passed.

The PostgreSQL container and migration application were not executed because the local Docker daemon was unavailable. This is an environment prerequisite for the first database-backed slice, not a hidden green claim.

## Readiness

Quality-gate evidence and final verdict are recorded in `docs/implementation/handoffs/KICKOFF-BOOTSTRAP.md` after verification.
