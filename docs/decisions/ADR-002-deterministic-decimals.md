# ADR-002: Decimal-only critical arithmetic boundary

## Status

Accepted

## Date

2026-08-29

## Context

D-005 and D-016 require reproducible critical arithmetic with full precision until the single final rounding step. IEEE-754 binary floating point cannot represent common decimal quantities exactly.

## Decision

Critical TypeScript arithmetic uses `decimal.js`; inputs cross the boundary as strings or bigint values. Native `number` inputs are rejected. PostgreSQL persistence will use `numeric` columns.

## Alternatives considered

- JavaScript `number` with epsilon tolerance: rejected because tolerance is test accommodation, not a business numeric strategy.
- Integer minor units only: insufficient for fractional coefficients, volumes, and repeating intermediate values.

## Consequences

Parsing, serialization, database mapping, calculations, and exporter work must preserve decimal strings/full precision. Presentation formatting cannot mutate stored values.
