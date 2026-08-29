# P0 Project Foundation Use-Case Contract

**Status:** IMPLEMENTATION CONTRACT — P0 only

**Authority:** subordinate to `docs/canonical/03-README.md` and D-001–D-025

**Scope:** project creation/selection, active context, approval, audit, and execution-history foundation

This contract does not amend canonical business rules. It defines the minimum
technical operations needed to prove the Phase 0 architecture.

## `previewProjectCreation`

- **Input:** project name and code.
- **Output:** normalized project draft plus deterministic preview fingerprint.
- **Actor:** `HUMAN` or `AI_AGENT`, role `TECHNICAL` or `ADMIN`.
- **Authorization:** role allowlist; both initial roles are admitted because the
  canonical source does not assign project creation exclusively to either role.
- **Domain invariant:** name is 3–120 trimmed characters; code is 2–20 uppercase
  alphanumeric/hyphen characters.
- **Transaction:** none.
- **Audit:** none; preview is deliberately mutation-free.
- **Persistence port:** none.

## `createProject`

- **Input:** project name/code and write initiation contract.
- **Output:** created project and active Project Context for the actor.
- **Actor:** `HUMAN` direct write or `AI_AGENT`-initiated write.
- **Authorization:** role allowlist; AI initiation additionally requires an
  explicit human confirmation matching the normalized preview fingerprint.
- **Domain invariant:** the same project draft invariant as preview; project code
  is unique at persistence level.
- **Transaction:** project, creator membership, active Project Context,
  execution record, and success audit event commit atomically.
- **Audit:** actor, role, action, project, request, result, and approval reference.
- **Persistence ports:** project repository, project-membership repository,
  active-context repository, execution-history repository, audit repository.

## `cancelProjectCreation`

- **Input:** preview fingerprint.
- **Output:** `CANCELLED` result.
- **Actor:** the human reviewing an AI preview.
- **Authorization:** valid human actor.
- **Domain invariant:** none beyond a non-empty fingerprint.
- **Transaction/audit/persistence:** none; cancellation is mutation-free.

## `listAccessibleProjects`

- **Input:** actor context.
- **Output:** projects for which the actor has membership, ordered by code.
- **Actor:** `HUMAN` or `AI_AGENT` with an initial role.
- **Authorization:** membership-scoped read.
- **Domain invariant:** no cross-project data is returned.
- **Transaction/audit:** read-only; no transaction and no mutation audit.
- **Persistence port:** project query repository.

## `selectActiveProject`

- **Input:** target project ID.
- **Output:** active Project Context.
- **Actor:** `HUMAN` or `AI_AGENT` with an initial role.
- **Authorization:** actor must have membership in the target project.
- **Domain invariant:** the active context belongs to exactly one actor and
  references exactly one accessible project.
- **Transaction:** active-context upsert, execution record, and audit event commit
  atomically.
- **Audit:** actor, role, action, project, request, and success result.
- **Persistence ports:** membership repository, active-context repository,
  execution-history repository, audit repository.

## `getActiveProjectHistory`

- **Input:** active Project Context and a bounded result limit (1–100).
- **Output:** execution records and audit events for that active project only.
- **Actor:** `HUMAN` or `AI_AGENT` with an initial role.
- **Authorization:** role allowlist plus membership in the active project.
- **Domain invariant:** a project context is required; records from any other
  project are never returned.
- **Transaction/audit:** read-only; no transaction and no mutation audit.
- **Persistence ports:** project membership query and project-history query.

## Failure semantics

- Authorization and validation fail before business mutation.
- A failed transactional write rolls back every business row in that transaction.
- Preview and cancellation never open a transaction.
- Infrastructure errors are mapped to stable application errors; raw SQL,
  credentials, and stack traces are not delivery contracts.
- Audit summaries are allowlisted metadata, never raw prompts or secrets.

## Delivery and AI paths

```text
Browser delivery -> Application use case -> Domain -> ports -> PostgreSQL adapter
Controlled tool  -> Application use case -> Domain -> ports -> PostgreSQL adapter
```

Delivery and controlled tools may validate transport shape, but neither owns
authorization, approval policy, domain validation, transactions, or audit rules.
