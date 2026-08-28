# ADR-003: PostgreSQL 17 with versioned Drizzle migrations

## Status

Accepted

## Date

2026-08-29

## Context

A-010 requires one PostgreSQL instance, while bootstrap needs a migration framework without prematurely inventing the Phase 1 physical data model.

## Decision

Use PostgreSQL 17 in Docker Compose and Drizzle's committed `generate`/`migrate` workflow. Migration tracking uses the `office` schema; the initial migration is an empty version marker and creates no business table.

## Alternatives considered

- Supabase-specific local stack: rejected as unnecessary coupling at foundation stage.
- Direct `push` workflow: rejected because it does not provide the same reviewable migration history.
- Prisma: viable, but the team benefits from Drizzle's small SQL-visible layer for this modular monolith.

## Consequences

Every schema change must be migration-backed and reviewed. Physical business tables wait for contract-driven modeling.
