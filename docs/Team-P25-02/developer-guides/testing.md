# Testing

Run commands from the repository root unless a package path is shown.
One-shot commands return a nonzero exit status when a test fails.

## Functional regression targets

The [functional regression matrix](../requirements/regression-test-matrix.md)
defines expected outcomes for CW-01 through CW-09. It is a target, not
evidence that a test exists or passed. Record mappings and run evidence in
the [RTM](../requirements/traceability/README.md) and relevant records.
A coverage percentage does not establish that a workflow outcome is asserted.

## Unit tests

Run the package suites independently:

```bash
npm test
npm --prefix src/backend test
```

Frontend unit and component tests use Vitest, jsdom, React Testing Library,
and mocked API boundaries. See the [frontend unit record](../modernization/implementation/testing/frontend-unit-test-validation.md)
for cases and dated results.

Backend unit tests use Vitest in Node with mocks and synthetic inputs.
They exclude integration tests and need no running MongoDB, SMTP, or
application server. See the [backend unit record](../modernization/implementation/testing/backend-unit-testing.md)
for cases and dated results.

Run both suites concurrently with `npm run test:all`. CI runs them
separately. Keep unit tests independent of live services and import Vitest
helpers explicitly.

## Coverage

```bash
npm run test:coverage
npm --prefix src/backend run test:coverage
npm run test:all:coverage
```

Local reports are written to `coverage/` and `src/backend/coverage/`.
They measure unit and component execution, not API integration or browser
execution. These local commands do not apply the CI coverage gates.

CI combines unit coverage with selected API runtime coverage. Browser E2E
tests do not contribute to the line-coverage report:

- Code pull requests require **80% of changed executable lines** to be covered.
- Merge-group code candidates require **70% overall line coverage in each
  package**, using the full unit and API integration suites.

Coverage measures execution; it does not establish that tests passed or
that functional regression outcomes were verified. See the
[CI guide](continuous-integration.md) and
[quality-gate policy](../requirements/quality-gate-policy.md) for the
gate rules and evidence.

## Isolated backend integration environment

The implemented integration command requires Docker and Compose, with Docker already running:

```bash
npm run test:integration
```

The runner starts a backend with disposable transaction-capable MongoDB and Mailpit services, generates isolated settings rather than reading the development `.env`, runs the backend integration suite, saves logs and a result summary under the ignored `test-results/integration/` directory, and cleans up its Compose project and volumes after success, failure, or a handled interrupt. It publishes no host ports. If Docker or the computer stops unexpectedly, inspect for leftover Compose resources before retrying.

Integration cases cover API/database operations, authorization, and email
handling. Dated results and cleanup evidence are retained in the
[API/database record](../modernization/implementation/testing/api-database-integration.md),
[authentication and authorization record](../modernization/implementation/testing/authentication-authorization-integration.md),
and [email record](../modernization/implementation/testing/email-integration.md).
Those recorded results do not represent a new run.

For development Compose setup and native backend connections, see the
[local development guide](local-development.md).

Run focused groups through the same isolated runner:

```bash
npm run test:integration -- authentication.test.js authenticationAccess.test.js authorization.test.js
npm run test:integration -- emailIntegration.test.js evaluationManagement.test.js
```

These tests do not establish complete browser journeys, external email
delivery, or exhaustive failure handling. CI runs selected integration
tests for code pull requests and the full suite for merge-group code
candidates. See the [CI implementation record](../modernization/implementation/continuous-integration.md)
for dated hosted results and the
[regression coverage gaps](../modernization/implementation/testing/regression-coverage-gaps.md)
for incomplete and missing scenarios.

## End-to-end browser tests

Run the isolated Chromium browser suite with Docker and Compose available:

```bash
npm run test:e2e
```

The runner builds a disposable frontend/backend/MongoDB/Mailpit stack, seeds guarded synthetic fixtures, runs Playwright sequentially, preserves logs and failure artifacts, and verifies cleanup. It does not read the development `.env` or publish ports. See the [end-to-end implementation record](../modernization/implementation/testing/end-to-end-testing.md) for prerequisites, cases, historical results, and coverage limits.

CI runs selected browser tests for code pull requests and the full suite
for merge-group code candidates. The runner saves results under
`test-results/e2e/`. See the
[CI implementation record](../modernization/implementation/continuous-integration.md)
for dated hosted results. These checks do not establish complete
functional regression coverage; see the
[coverage gaps](../modernization/implementation/testing/regression-coverage-gaps.md).

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
