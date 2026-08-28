# Technical Implementation Decisions

**Status:** ACCEPTED FOR BOOTSTRAP
**Date:** 2026-08-29
**Scope:** Phase 0 + Phase 1 repository foundation only

These are technical choices under D-025. They do not amend business contracts or promote deferred scope.

## TD-001 — Node.js 22, TypeScript 5.9, pnpm 11 workspace

Use the locally installed Node.js 22 LTS line, strict TypeScript, and pnpm 11 through Corepack. Internal packages use `workspace:*`, so a missing local package cannot silently resolve from a registry. No Nx/Turborepo layer is needed at this scale.

Dependency installation is an explicit gate (`install --frozen-lockfile` after the lockfile exists); quality scripts do not auto-install or mutate dependencies. Dependency lifecycle builds are denied by default except for the explicit `esbuild` and `unrs-resolver` allowlist required by the selected toolchain.

Source: https://pnpm.io/workspaces

## TD-002 — Next.js App Router browser shell

Use Next.js 16.3.3 with React 19.2.8 for `apps/office-web`. This satisfies browser-based local use while preserving a normal server deployment path. The shell contains no business calculations. Lint remains an explicit command because current Next.js does not run it as part of `next build`.

Source: https://nextjs.org/docs/app/getting-started/installation

## TD-003 — PostgreSQL 17 and Drizzle versioned migrations

Run one PostgreSQL 17 container locally. Use Drizzle schema declarations with committed `generate`/`migrate` history; do not use schema `push` as the reproducible team workflow. Drizzle migration tracking is configured under the `office` schema, and the kickoff migration is an empty version marker so entity/table design is not invented before contract-driven modeling.

Sources: https://orm.drizzle.team/docs/drizzle-kit-generate and https://orm.drizzle.team/docs/kit-overview

## TD-004 — Deterministic decimal strategy

Critical RAB arithmetic must enter TypeScript as decimal strings or bigint values and use `decimal.js` configured at 40 significant digits with half-up rounding mode. JavaScript `number` is rejected at the critical boundary. Persistence will use PostgreSQL `numeric`, never floating-point columns, for coefficients, prices, volumes, rates, subtotals, tax, and totals.

Formatting is presentation only. Business rounding will be implemented explicitly per D-016; configuring Decimal's rounding mode does not authorize intermediate rounding.

## TD-005 — Vitest, ESLint, TypeScript, and an executable boundary check

Use Vitest 4 for small unit/contract tests, ESLint for source quality, strict TypeScript for module contracts, and `scripts/check-boundaries.mjs` for the allowed internal dependency graph. Vitest's modern configuration uses the current project/config model rather than obsolete workspace configuration.

ESLint is compatibility-pinned to 9.39.5 because the React/import/accessibility plugins shipped with `eslint-config-next` 16.3.3 do not yet declare ESLint 10 peer support. Upgrade when that peer graph becomes valid; do not force a peer mismatch.

Source: https://vitest.dev/guide/migration.html#workspace-is-replaced-with-projects

## TD-006 — IDs remain opaque; physical encoding deferred

Canonical IDs remain opaque and immutable. UUID/ULID choice is intentionally not made in this kickoff because Jalur A permits the blueprint to choose encoding, and no entity table needs it yet.

## TD-007 — AI provider disabled by default

The AI package contains controlled tool adapters/registry only. It has no provider SDK, database client, storage adapter, terminal, or filesystem dependency. `AI_ENABLED=false` is the default and the web/core baseline must build without an LLM credential.

## TD-008 — Project files stay behind a future storage adapter

`storage/` is reserved and ignored except for `.gitkeep`. No business facts are stored there and no direct AI access is created. The first actual file workflow must define an Application port and scoped infrastructure adapter.

## TD-009 — No Excel/PDF dependency in bootstrap

Excel exporter implementation begins only after calculation/use-case contracts are stable. Minimum Excel version and physical `HSP_MAPPING` placement remain exporter-blueprint decisions. PDF remains deferred by D-022.

## Alternatives rejected at kickoff

- Supabase-specific runtime: unnecessary coupling; PostgreSQL is the accepted foundation.
- Prisma: capable, but Drizzle provides a smaller SQL-visible migration layer for this TypeScript monolith.
- Turborepo/Nx: additional orchestration with no demonstrated need for seven small workspaces.
- Native `number` plus tolerances: unacceptable for critical financial arithmetic.
- Redis/vector/graph DB or queue: explicitly out of scope.
