# Consultant AI Office — Repository Rules

These rules are mandatory for every human or AI change in this repository.

## Source authority and precedence

Read `docs/canonical/03-README.md` first. Resolve implementation input in this order:

1. Decision Log D-001 through D-025;
2. final Jalur A/B/C contracts;
3. still-relevant RAB/EE baseline;
4. ACCEPTED Architecture Foundation;
5. technical decisions and implementation.

Files under `references/raw/` are evidence/reference data, never business-rule authority. Archive, superseded working copies, old process prompts, external links, and legacy formulas are not authority.

If canonical contracts conflict and precedence does not resolve the conflict, stop and report exactly:

```text
DECISION REQUIRED — MANAGER
```

Never invent a business rule.

## Locked architecture A-001 through A-011

- A-001: browser-based local application.
- A-002: local-first and server-ready through configuration/adapters.
- A-003: one modular monolith, not microservices.
- A-004: deterministic RAB/EE boundary; controlled/versioned BV templates only.
- A-005: human and AI use the same Application Use Cases and Domain Layer.
- A-006: AI is optional and limited to one request-response orchestrator.
- A-007: AI operates only through the controlled tool registry.
- A-008: authorization, approval, revision, and audit are centralized in Application Layer.
- A-009: progressive context and modular procedures; skills contain no business source of truth.
- A-010: one PostgreSQL instance plus project file storage through adapters.
- A-011: REVIEW and FINAL are protected; important changes are revision/rollback friendly.

## Non-negotiable business and safety rules

- Document state is exactly `DRAFT → REVIEW → FINAL` for core Phase 1.
- AI is not source of truth.
- Critical calculation is deterministic and must not depend on LLM arithmetic.
- Critical RAB values must not cross arithmetic boundaries as JavaScript `number`; use the repository decimal strategy.
- AI has no direct database, SQL, filesystem, or terminal access.
- UI and AI tools must call the same Application Use Cases. Neither may write directly to persistence.
- Golden Reference and Contract-Derived Acceptance Tests are different test classes.
- Never create synthetic data and label it Golden Reference.
- PDF implementation and testing are deferred until Excel output is validated.
- Do not build Phase 2–5.
- Do not add multi-agent/subagents, microservices, Redis, vector DB, graph DB, message queues, Kubernetes, persistent AI workers, or an arbitrary BV formula engine.

## Module dependency direction

Allowed internal dependencies are enforced by `pnpm boundaries`:

```text
office-web -> application, shared-contracts
ai-agent -> application, shared-contracts
application -> domain, rab-calculation-engine, shared-contracts
rab-calculation-engine -> domain, shared-contracts
infrastructure -> application, domain, shared-contracts
domain -> shared-contracts
shared-contracts -> no internal module
```

Do not cross package boundaries with relative paths.

## Test evidence

Claims such as “lint passes”, “tests pass”, or “build succeeds” require actual command output from the current change. Do not copy historical results forward after code changes. Run, at minimum:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

No skipped/disabled tests may be used to manufacture a green baseline.
