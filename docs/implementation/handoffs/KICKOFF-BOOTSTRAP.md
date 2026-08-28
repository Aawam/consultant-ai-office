# Kickoff Bootstrap Handoff

**Date:** 2026-08-29
**Scope:** Phase 0 AI Office Foundation + Phase 1 RAB/EE repository foundation
**Baseline commit:** `7305705569079cb2b8abc016c2d24f4086105fac`
**Verdict:** **READY FOR PARALLEL IMPLEMENTATION**

This handoff records a bootstrap, not a closeout. Broad Phase 0 UI and Phase 1 calculation implementation have not started.

## Canonical audit outcome

The full canonical set indexed by `docs/canonical/03-README.md` was audited before technical selection. No unresolved contract conflict blocks the repository foundation. D-023 and D-024 supersede stale zero-policy passages in the Golden Test contract by the explicit Decision Log precedence; this is not treated as a new business-rule assumption.

### BUILD NOW

- One browser-based, local-first, server-ready modular monolith.
- Shared Application Use Cases and Domain boundary for human and AI clients.
- Deterministic decimal boundary for future critical RAB arithmetic.
- Controlled AI tool registry, with AI disabled by default.
- One PostgreSQL instance, versioned migration skeleton, and storage boundary.
- Executable module boundaries and install/lint/typecheck/test/build baseline.

### DESIGN FOR LATER

- Server deployment, remote access, and object-storage adapter.
- Provider switching, richer trace retention, and justified scoped adapters.
- Entity schema and opaque ID encoding.
- Excel exporter physical design and supported Excel version.
- PDF only after Excel output is validated.

### DO NOT BUILD YET

- Phase 2–5 capabilities.
- Multi-agent runtime, persistent AI workers, or self-modifying skills.
- Microservices, Redis, vector DB, graph DB, queue, or Kubernetes.
- Arbitrary/custom BV formula engine.
- Broad RAB/EE formulas, broad Phase 0 UI, PDF, CAD/GIS, RKS, or Project Control.

## Chosen stack and reasons

| Area | Choice | Reason |
|---|---|---|
| Runtime | Node.js 22.23.0 | Installed LTS line, mainstream TypeScript runtime |
| Workspace | Corepack + pnpm 11.24.0 | Strict workspace linking, deterministic lockfile, low orchestration overhead |
| Language | TypeScript 5.9.3, strict mode | One language across browser, use cases, domain contracts, and adapters |
| Web shell | Next.js 16.3.3 App Router + React 19.2.8 | Browser-local use now with conventional server deployment path later |
| Database | PostgreSQL 17 Alpine | Matches A-010 without adding a platform-specific runtime |
| Migrations | Drizzle ORM 0.45.2 + Drizzle Kit 0.31.10 | SQL-visible, committed migration workflow; no schema `push` workflow |
| Exact arithmetic | decimal.js 10.6.0 + future PostgreSQL `numeric` | Prevents binary floating-point at critical RAB boundaries |
| Tests | Vitest 4.1.11 | Fast TypeScript unit and contract test baseline |
| Quality | ESLint 9.39.5 + TypeScript + custom boundary checker | Explicit, maintainable gates with executable dependency direction |

ESLint 9 is intentionally compatibility-pinned because the plugin peer graph bundled with the selected Next.js version does not yet support ESLint 10 cleanly. No Nx or Turborepo layer was added.

## Repository tree

```text
consultant-ai-office/
├── apps/
│   └── office-web/                 # Minimal browser shell only
├── packages/
│   ├── application/                # Use-case and audit ports
│   ├── domain/                     # Core request/actor/version contracts
│   ├── rab-calculation-engine/      # Exact-decimal primitives only
│   ├── ai-agent/                    # Controlled tool adapters/registry only
│   ├── infrastructure/              # PostgreSQL/Drizzle adapter foundation
│   └── shared-contracts/            # Stable cross-boundary contracts
├── contracts/
│   ├── application/
│   ├── exports/
│   └── tools/
├── tests/
│   ├── unit/
│   ├── contracts/
│   ├── golden-reference/
│   ├── contract-derived/
│   ├── approval-policy/
│   └── audit/
├── fixtures/
│   ├── ahsp/
│   ├── price-sets/
│   ├── golden-reference/
│   └── contract-derived/
├── docs/
│   ├── canonical/
│   ├── decisions/
│   └── implementation/
├── references/
│   ├── raw/
│   └── MANIFEST.md
├── scripts/check-boundaries.mjs
├── storage/
├── compose.yaml
├── package.json
├── pnpm-workspace.yaml
└── AGENTS.md
```

## Commands

```bash
corepack pnpm@11.24.0 install --frozen-lockfile
corepack pnpm@11.24.0 lint
corepack pnpm@11.24.0 typecheck
corepack pnpm@11.24.0 test
corepack pnpm@11.24.0 build
corepack pnpm@11.24.0 boundaries
corepack pnpm@11.24.0 db:check
```

Use the pinned Corepack command during onboarding. A global pnpm installation is not assumed to match the repository version.

## Environment requirements

- Node.js `22.x`; verified with `v22.23.0`.
- Corepack and pnpm `11.24.x`; verified with `11.24.0`.
- Docker Engine/Desktop with Compose; CLI verified as Docker `29.6.2` and Compose `v5.3.1`.
- Copy `.env.example` to `.env`; AI remains disabled and needs no provider credential.
- Port `3000` for the web app and configurable `POSTGRES_PORT` (default `5432`).
- Project file storage defaults to `./storage/projects` and remains behind a future adapter.

## PostgreSQL setup

```bash
cp .env.example .env
corepack pnpm@11.24.0 db:up
corepack pnpm@11.24.0 db:migrate
```

`compose.yaml` provisions exactly one `postgres:17-alpine` service with a health check and persistent named volume. Drizzle migration history is committed under `packages/infrastructure/migrations/`; the initial migration is a non-business marker and creates no invented entity tables.

Static Compose validation and `drizzle-kit check` passed. Docker Desktop did not expose a running daemon during this kickoff, so the container and migration application were not executed. Any database-backed parallel stream must run the two commands above and capture actual evidence before claiming PostgreSQL runtime readiness.

## Test baseline

Executed on 2026-08-29 against baseline commit content:

| Gate | Result | Evidence |
|---|---|---|
| Frozen install | PASS | 8 workspace projects; lockfile already up to date |
| Lint + boundaries | PASS | zero lint warnings; 7 module boundaries valid |
| Typecheck | PASS | all 7 source workspaces |
| Tests | PASS | 4 files, 8 tests |
| Production build | PASS | Next.js static `/` and `/_not-found` routes |
| Drizzle check | PASS | migration history consistent |
| Compose config | PASS | `docker compose config --quiet` exited 0 |

No tests were skipped or disabled. Tests prove decimal exactness and native-number rejection, unique controlled-tool names, repository guardrails/reference hashes, and the non-business PostgreSQL bootstrap.

## Technical decisions

- TD-001 through TD-009 are recorded in `docs/implementation/TECHNICAL-DECISIONS.md`.
- ADR-001 locks the workspace/web stack.
- ADR-002 locks decimal input and persistence strategy.
- ADR-003 locks PostgreSQL/Drizzle migration practice.
- Package direction is enforced both through `workspace:*` manifests and `scripts/check-boundaries.mjs`.
- Canonical sources remain untouched as authority; raw references are hash-tracked but are not business rules.

## Unresolved questions and prerequisites

No unresolved business-contract conflict requires a Manager decision for bootstrap.

- Docker daemon availability is an environment prerequisite for runtime DB verification.
- Physical database entity schema and ID encoding remain future blueprint decisions.
- Minimum supported Excel version remains an exporter-blueprint decision.
- Per-record AHSP mapping anomalies remain data-resolution work only when affected records enter implementation.
- A network dependency audit was not completed because the environment denied the external audit call; no green security-audit claim is made.

## Changed files

Baseline commit `7305705569079cb2b8abc016c2d24f4086105fac` adds 88 files:

- Root governance/config: `.env.example`, `.gitignore`, `AGENTS.md`, `README.md`, `compose.yaml`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, TypeScript/Vitest/ESLint configs, and `scripts/check-boundaries.mjs`.
- Web shell: `apps/office-web/{app,next.config.ts,next-env.d.ts,package.json,tsconfig.json}`.
- Six logical packages: each package manifest, TypeScript config, and minimal source entry point; infrastructure also adds Drizzle config/schema/migrations.
- Tests/fixtures/contracts/storage: required logical directories, exact-decimal/tool-registry/governance/PostgreSQL tests, and test-class separation markers.
- Documentation: three ADRs, implementation status/technical decisions, architecture/scope placeholders, task plan/checklist, and this repository's canonical source set.
- Provenance: `references/MANIFEST.md` and the four source reference binaries in `references/raw/`.

The exact baseline list is reproducible with:

```bash
git show --name-only --format= 7305705569079cb2b8abc016c2d24f4086105fac
```

## Readiness for parallel work

Parallel implementation may begin inside the enforced package boundaries after each stream reads `AGENTS.md` and the canonical index. Recommended first slices are contract-driven entity/use-case modeling, deterministic RAB calculation primitives, infrastructure ports/adapters, and minimal web composition. They must not independently invent business rules or bypass Application Use Cases.

**READY FOR PARALLEL IMPLEMENTATION**
