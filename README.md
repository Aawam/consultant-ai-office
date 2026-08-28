# Consultant AI Office

One local-first, server-ready modular monolith for the Phase 0 AI Office Foundation and Phase 1 RAB/Engineer's Estimate capability.

The repository is deliberately at bootstrap scope: it establishes executable boundaries, deterministic decimal infrastructure, a controlled AI tool boundary, PostgreSQL migration tooling, and a minimal browser shell. Broad Phase 0 UI and Phase 1 RAB/EE business implementation have not started.

## Source of truth

Start with [Canonical Document Index](docs/canonical/03-README.md). Reference binaries under `references/raw/` are provenance-tracked inputs, not business-rule authority.

## Requirements

- Node.js 22.x
- pnpm 11.24.x (Corepack)
- Docker with Compose (for local PostgreSQL)
- PostgreSQL client is optional but useful for diagnostics

## Quick start

```bash
cp .env.example .env
corepack pnpm@11.24.0 install --frozen-lockfile
corepack pnpm@11.24.0 db:up
corepack pnpm@11.24.0 db:migrate
corepack pnpm@11.24.0 dev
```

Open `http://localhost:3000`.

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Run the local Next.js shell |
| `pnpm lint` | ESLint plus module-boundary validation |
| `pnpm typecheck` | Strict TypeScript checks for all workspace modules |
| `pnpm test` | Vitest unit and contract tests |
| `pnpm build` | Typecheck and production web build |
| `pnpm boundaries` | Validate modular-monolith dependency direction |
| `pnpm db:up` | Start local PostgreSQL 17 |
| `pnpm db:generate` | Generate a versioned Drizzle migration |
| `pnpm db:migrate` | Apply committed migrations |
| `pnpm db:check` | Check migration consistency |
| `pnpm db:down` | Stop local containers |

## Architecture

```text
Web UI ───────────┐
                  ├─> Application Use Cases -> Domain / RAB Engine
Optional AI Tools ┘                    |
                                       v
                              Infrastructure Ports/Adapters
```

Package direction is executable via `pnpm boundaries`. AI cannot access PostgreSQL, SQL, filesystem, or terminal directly. Critical arithmetic uses `decimal.js` at TypeScript boundaries and PostgreSQL `numeric` when persisted.

See [Technical Decisions](docs/implementation/TECHNICAL-DECISIONS.md), [Implementation Status](docs/implementation/STATUS.md), and [Kickoff Handoff](docs/implementation/handoffs/KICKOFF-BOOTSTRAP.md).
