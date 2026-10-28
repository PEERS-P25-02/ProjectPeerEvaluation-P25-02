# Testing

Run the commands below from the repository root unless a command specifies a package path. One-shot commands return a nonzero exit status when a test fails.

## Functional regression targets

Plan functional regression checks against the [PEERS Functional Regression Test Matrix](../requirements/regression-test-matrix.md). Its stable IDs and expected outcomes define the target for CW-01 through CW-09; they do not claim current coverage or test results. Keep expected outcomes aligned with the validated requirements and critical workflows. Record implemented test mappings and run evidence in the [RTM](../requirements/traceability/README.md) and relevant implementation records. A coverage gap is not a reason to weaken a matrix outcome.

## Unit tests

Run package-specific suites independently:

```bash
npm test
npm --prefix src/backend test
```

The frontend suite uses Vitest with jsdom, React Testing Library, and shared setup at `src/frontend/test/setup.js`. Frontend tests belong in `src/frontend/tests/` and use `.test.jsx` or `.spec.jsx` filenames. The backend suite uses Vitest in Node; backend tests belong in `src/backend/tests/` and use `.test.js` or `.spec.js` filenames.

Run both suites concurrently as a local convenience with `npm run test:all`. CI runs package-specific commands separately so failures appear in their own jobs. Ordinary backend unit commands exclude `src/backend/tests/integration/`, so unit testing does not require Docker, MongoDB, or SMTP. Keep unit tests independent of live services unless a test is explicitly an integration test. Use React Testing Library for rendered frontend behavior and import Vitest helpers explicitly.

## Coverage

```bash
npm run test:coverage
npm --prefix src/backend run test:coverage
npm run test:all:coverage
```

Coverage reports are written to `coverage/` and `src/backend/coverage/`. These commands measure the separate unit/component suites; they do not include execution in the integration API server or browser. CI uploads coverage as workflow artifacts. Coverage is informational; no minimum threshold is enforced. Combined scoped frontend/backend reporting remains deferred; implementing browser E2E does not by itself combine coverage reports.

## Isolated backend integration environment

The implemented integration command requires Docker and Compose, with Docker already running:

```bash
npm run test:integration
```

The runner starts a backend with disposable transaction-capable MongoDB and Mailpit services, generates isolated settings rather than reading the development `.env`, runs the backend integration suite, saves logs and a result summary under the ignored `test-results/integration/` directory, and cleans up its Compose project and volumes after success, failure, or a handled interrupt. It publishes no host ports. If Docker or the computer stops unexpectedly, inspect for leftover Compose resources before retrying.

The October 26 baseline contained 176 tests in 12 files: four environment checks, 69 original API/database cases, 96 authentication/authorization cases, and seven invitation-email cases. It exercises stored course, roster, team, evaluation, and report state; professor ownership and student-recipient access; and actual SMTP content, links, rejection, and recovery through Mailpit. The [API/database record](../modernization/implementation/testing/api-database-integration.md) and [email record](../modernization/implementation/testing/email-integration.md) retain dated passing results and verified cleanup; these are recorded outcomes, not a new execution claim.

The [priority regression follow-up](../modernization/implementation/testing/api-database-integration.md#6-priority-workflow-regression-follow-up) retains PR #134’s original 184-pass/10-failure run and PR #137’s separate 188-pass run as dated evidence. The combined follow-up reuses the submission-integrity suite for overlapping CW-08 cases, adds distinct participation-0/communication-0 checks, and repairs CSV error disclosure and reset completion. Run it with `npm run test:integration -- priorityRoster.test.js priorityLifecycle.test.js submissionIntegrity.test.js`. The combined source passed 24 focused checks, all 200 integration tests, and 13 Chromium tests with cleanup verified on October 28, 2026; exact run IDs and commands are in the linked record. Remaining matrix gaps are distinct from those passing results.

All three supplied Compose stacks initialize the single-node `peers-rs` replica set and gate backend startup on its writable primary. Submission transactions require a replica set or sharded MongoDB deployment. A native backend connecting to the development Compose published port needs `directConnection=true`; see the [local development guide](local-development.md). Unit tests remain independent of live services.

Run focused groups through the same isolated runner:

```bash
npm run test:integration -- authentication.test.js authenticationAccess.test.js authorization.test.js
npm run test:integration -- emailIntegration.test.js evaluationManagement.test.js
```

These tests do not start the frontend or establish complete browser journeys, external email delivery, or exhaustive failure handling. Integration execution is not yet part of the CI workflow. Use the [regression coverage gaps](../modernization/implementation/testing/regression-coverage-gaps.md) to distinguish existing assertions from incomplete and missing scenarios; keep the stable regression matrix's expected outcomes unchanged.

## End-to-end browser tests

Run the isolated Chromium browser suite with Docker and Compose available:

```bash
npm run test:e2e
```

The runner builds a disposable frontend/backend/MongoDB/Mailpit stack, seeds guarded synthetic fixtures, runs Playwright sequentially, preserves logs and failure artifacts, and verifies cleanup. It does not read the development `.env` or publish ports. See the [end-to-end implementation record](../modernization/implementation/testing/end-to-end-testing.md) for prerequisites, cases, historical results, and coverage limits.

## Linting and formatting

Run from the repository root. Lint covers frontend, backend, tests, and tooling JavaScript/JSX. Formatting checks and writes JavaScript/JSX files across the repository.

```bash
npm run lint
npm run format:check
npm run format
```

See the [ESLint migration notes](../modernization/implementation/tooling/eslint-and-formatting.md) for configuration details and limitations.

## Implementation records

These project documents describe existing test implementations, evidence, and limitations:

- [Frontend unit testing implementation](../modernization/implementation/testing/unit-testing.md#initial-unit-test-cases)
- [Backend unit testing implementation](../modernization/implementation/testing/backend-unit-testing.md)
- [CI build, lint, and unit verification](../modernization/implementation/continuous-integration.md)
- [Integration test environment](../modernization/implementation/testing/integration-test-environment.md)
- [Evaluation invitation email integration](../modernization/implementation/testing/email-integration.md)
- [API and database integration](../modernization/implementation/testing/api-database-integration.md)
- [Authentication and authorization integration](../modernization/implementation/testing/authentication-authorization-integration.md)
- [API/database operation inventory](../modernization/implementation/testing/api-database-operation-inventory.md)
- [End-to-end browser testing](../modernization/implementation/testing/end-to-end-testing.md)
- [ESLint migration notes](../modernization/implementation/tooling/eslint-and-formatting.md)
