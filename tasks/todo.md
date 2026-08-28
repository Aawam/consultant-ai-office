# Kickoff Bootstrap Checklist

## Task 1: Workspace foundation

**Acceptance criteria:**

- [x] Required logical directories are workspace packages.
- [x] Root commands exist for install, lint, typecheck, test, build, and boundary validation.

**Verification:** `pnpm install` and `pnpm boundaries`

**Dependencies:** None

## Task 2: Governance and provenance

**Acceptance criteria:**

- [x] Root `AGENTS.md` locks all requested canonical guardrails.
- [x] Reference manifest records SHA-256, role, and provenance without promoting reference files to authority.

**Verification:** contract test scans required rules and manifest entries.

**Dependencies:** Task 1

## Task 3: Deterministic package baseline

**Acceptance criteria:**

- [x] Six required packages compile through explicit dependency direction.
- [x] Critical decimal boundary rejects native numbers and proves exact decimal behavior.

**Verification:** `pnpm test` and `pnpm typecheck`

**Dependencies:** Task 1

## Task 4: Web and PostgreSQL baseline

**Acceptance criteria:**

- [x] Minimal Next.js shell builds.
- [x] Compose and Drizzle migration skeleton are documented and internally consistent.

**Verification:** `pnpm build` and migration config tests.

**Dependencies:** Tasks 1 and 3

## Task 5: Handoff and commit

**Acceptance criteria:**

- [x] Actual quality-gate results are recorded.
- [x] Baseline commit hash is recorded after the verified commit.
- [x] Readiness verdict is explicit.

**Verification:** clean `git status` and handoff review.

**Dependencies:** Tasks 1–4
