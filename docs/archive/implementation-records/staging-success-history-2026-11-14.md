# Staging success history implementation — 2026-11-14

This record describes the implementation at that date. Selective deployment,
drift checks, and updates to `staging-last-success` were later retired; see the
[CD simplification record](staging-cd-simplification-2026-11-14.md) and the
[current CI/CD guide](../../ci-cd.md).

## Change

CD now validates same-run deployment and smoke artifacts before recording a staging success. The JSON tag manifest is versioned (`kind: cd`, `schema_version: 1`) and binds the source SHA, exact backend/frontend GHCR digests, distinct configured service IDs, Render deploy IDs, workflow run/attempt, and all three required passing smoke checks. The workflow creates `staging-success/cd-<run-id>-<attempt>` and updates annotated `staging-last-success` in one atomic push guarded by the previously observed marker object ID. It prints a prominent link to the history tag only after verifying both remote refs.

Selective path skips now require a valid annotated marker and complete, unambiguous Render evidence that both current live image refs and service IDs match the manifest. Unknown/active states, missing or lightweight markers, missing configuration, API/pagination uncertainty, and drift all choose deployment of both services. Existing current-main, two-parent, image publication, backend-first deploy, health, and smoke gates remain required.

## Changed paths

- `.github/workflows/cd.yml`: same-run artifact validation, conservative Render drift guard, final decision output, atomic history/marker transaction.
- `.github/workflows/ci.yml`: include focused staging-history contract tests in policy tests.
- `scripts/stagingHistory.cjs` and `scripts/stagingHistory.test.cjs`: manifest validation, annotated marker parsing, bounded Render pagination and drift decision, synthetic atomic Git ref test.
- [Staging operations](../../staging-operations.md): current tag behavior, limitations, and manual one-record backfill steps.

## Verification

The focused `scripts/stagingHistory.test.cjs` and `scripts/decideStaging.test.cjs` suites passed all 18 tests, including a disposable bare Git repository transaction covering success, duplicate-history rejection, and stale-marker lease rejection. Full `npm run lint` passed after installing locked backend dependencies with `npm ci --prefix src/backend`; the root and backend package lockfiles remained unchanged. Full `npm run format:check`, Prettier workflow YAML parsing/check, and `git diff --check` passed.

Local synthetic tests cannot establish GitHub's hosted atomic-push support or production Render API behavior. No live Render mutation, GitHub ref write, or backfill was performed.

## Tag protection limit

The read-only GitHub settings review found no tag ruleset; the active ruleset protects the main branch only. Workflow-created history tags are append-only by convention and non-force workflow behavior, not Git-enforced immutable objects. Privileged repository actors can still edit or delete them.
