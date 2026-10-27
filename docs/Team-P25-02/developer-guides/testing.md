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

Coverage reports are written to `coverage/` and `src/backend/coverage/`. CI uploads coverage as workflow artifacts. Coverage is informational; no minimum threshold is enforced.

## Isolated backend integration environment

The implemented integration command requires Docker and Compose:

```bash
npm run test:integration
```

The runner starts a backend with disposable MongoDB and Mailpit services, generates isolated settings rather than reading the development `.env`, runs the backend integration suite, saves logs and a result summary under the ignored `test-results/integration/` directory, and cleans up its Compose project and volumes after success, failure, or a handled interrupt. It publishes no host ports. If Docker or the computer stops unexpectedly, inspect for leftover Compose resources before retrying.

The current checks cover readiness, API/database communication, SMTP capture, and fixture reset. They do not start the frontend or test every application workflow. Broader regression and end-to-end coverage remains planned.

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
- [API and database integration](../modernization/implementation/testing/api-database-integration.md)
- [API/database operation inventory](../modernization/implementation/testing/api-database-operation-inventory.md)
- [ESLint migration notes](../modernization/implementation/tooling/eslint-and-formatting.md)
