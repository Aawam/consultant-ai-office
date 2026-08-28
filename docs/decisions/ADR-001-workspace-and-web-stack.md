# ADR-001: TypeScript pnpm workspace with Next.js shell

## Status

Accepted

## Date

2026-08-29

## Context

The accepted Architecture Foundation requires one browser-based local-first modular monolith with explicit logical packages and a server migration path.

## Decision

Use Node.js 22, strict TypeScript, a pnpm workspace, and one Next.js App Router application. Use pnpm scripts directly; add no monorepo orchestrator.

## Alternatives considered

- Separate applications/repositories: rejected by the objective and modular-monolith decision.
- Electron core: deferred by A-001.
- Nx/Turborepo: rejected until build scale demonstrates a need.

## Consequences

All modules share one lockfile and deployment unit. Package boundaries remain independently testable and are enforced by an executable allowlist.
