# Testing

PEERS uses service-free unit tests, isolated integration and browser tests, and
post-deployment staging smoke checks. Together they help catch regressions across
individual functions, service boundaries, and user journeys. The
[regression matrix](./archive/plans/requirements/regression-test-matrix.md) lists
expected critical-workflow outcomes; a listed target or a coverage percentage
alone is not evidence that the outcome passed.

## Prerequisites and unit tests

Run commands from the repository root. Use Node.js `^22.22.2 || ^24.15.0 ||
>=26.0.0` and npm 9 or newer, with dependencies installed for both packages; see
the [development guide](./development.md). Unit suites use Vitest: frontend tests
use jsdom and React Testing Library, while backend tests run in Node. Frontend
tests are under `src/frontend/tests/`; backend tests are under
`src/backend/tests/`, with `integration/` excluded from ordinary unit runs.

```bash
npm test                              # frontend, once
npm --prefix src/backend test         # backend, once
npm run test:all                      # both suites concurrently
npm run test:watch                    # frontend watch mode
npm --prefix src/backend run test:watch
```

Unit tests use synthetic inputs and mocks for external boundaries; they do not
require a running application, MongoDB, or SMTP service. Import Vitest helpers
explicitly, reset mocks and timers between cases, and avoid coupling tests to
shared state. Mocked persistence and email do not prove real database or
delivery behavior. Historical cases and dated results are in the archived
[frontend](./archive/implementation-records/frontend-unit-testing.md) and
[backend](./archive/implementation-records/backend-unit-testing.md) records.

## Integration and browser tests

Start Docker and ensure Docker Compose v2 is available. The commands below
build and remove their own disposable test stacks. The first build may require
network access for images and dependencies.

```bash
npm run test:integration
npm run test:integration -- authentication.test.js
npm run test:e2e
npm run test:e2e -- tests/e2e/smoke.spec.cjs
```

Integration tests use Vitest against the Express API, a MongoDB replica set,
and Mailpit. They cover database operations, authentication and authorization,
and captured email such as invitations and reset links. The root runner
provisions the environment; the backend package's
`test:integration` script alone expects an already configured environment.
Playwright drives Chromium against a separate stack containing the frontend and
backend. These suites exercise selected regression scenarios; use the
[testing records](./archive/implementation-records/testing-implementation-index.md)
and matrix to find the mapped cases and their limits.

Each run owns a uniquely named Compose project, database, and inbox, uses
synthetic fixtures and no published host ports, and does not read the developer
`.env`. Database and inbox resets are guarded and run sequentially within a
stack. Runners retain logs and `result.json` in ignored
`test-results/integration/<run-id>/` or `test-results/e2e/<run-id>/`, remove
their own resources, and verify cleanup. A failed setup, test, or cleanup yields
a nonzero exit; inspect the result and logs before retrying. A focused run is
not a full-suite result. External email delivery is not tested by Mailpit.

## Staging smoke checks

For an explicitly authorized manual run against the configured staging
services, install the Playwright Chromium browser, provide the protected
`STAGING_EVALUATION_TOKEN` through the environment without exposing it in shell
history, and run:

```bash
npx playwright install chromium
npm run test:staging
```

The command requires a reusable synthetic staging fixture. Optional
`STAGING_FRONTEND_URL` and `STAGING_BACKEND_URL` override the configured
defaults; the guard accepts only bare HTTPS `*.onrender.com` origins. Confirm
that the configured origins identify the intended staging services. The checks
cover backend health, a rendered login with rejected synthetic credentials,
and loading an unsubmitted synthetic evaluation without modifying the fixture.
They use a separate Playwright configuration with screenshots, video, and traces
disabled. `npm run test:staging:guard` tests the local guard without contacting
staging. See the archived [smoke record](./archive/implementation-records/staging-smoke-tests.md)
for historical evidence and the [staging operations guide](staging-operations.md#smoke-verification)
for fixture handling, results, and troubleshooting.

## Coverage and CI

```bash
npm run test:coverage
npm --prefix src/backend run test:coverage
npm run test:all:coverage
```

These commands collect V8 unit coverage into `coverage/` and
`src/backend/coverage/`, including HTML, LCOV, and JSON reports. The backend
command also checks report integrity. These local unit reports do not include
integration or browser execution and do not enforce the CI numerical gates.

CI runs complete frontend and backend unit suites and the complete API
integration suite for pull requests, merge groups, and main pushes, including
documentation-only changes. It combines canonical unit and API runtime
coverage; browser E2E runs on merge groups and main pushes but does not
contribute to that report. CI applies event-specific changed-line or overall
line gates. Consult the [quality gate policy](./requirements/quality-gates.md)
for requirements and the [CI guide](ci-cd.md)
for pipeline execution. Staging smoke checks are separate from normal CI and
run in staging delivery and rollback workflows.

## Troubleshooting

- **Dependencies or Node errors:** check the supported versions above and
  install dependencies in both packages as described in the development guide.
- **Docker build or readiness fails:** confirm the daemon and Compose are
  available, check image/network access and the run's service logs, then retry.
  A MongoDB replica set must become writable before the backend is ready.
- **Cleanup fails or the host stops unexpectedly:** inspect the printed
  run-specific Compose project and `result.json`. Clean up only that project's
  resources. The [integration environment record](./archive/implementation-records/integration-test-environment.md)
  gives its manual cleanup procedure; the E2E runner uses `compose.e2e.yml` and
  its own project name. Never use global Docker pruning.
- **Staging configuration fails:** verify the intended origins, protected token,
  synthetic fixture, and installed Chromium; do not copy a token into logs.
- **A coverage report or test fails:** inspect the named report or retained
  run logs. A test pass, a coverage figure, and a verified regression outcome
  are distinct results.
