# Milestone 2: Unit Testing Implementation

**Updated:** October 21, 2026
**Status:** Initial tooling plus backend success, failure, and boundary coverage implemented; integration and end-to-end coverage remain separate

## Purpose and Scope

This document records testing implementation completed on branch `28-configure-frontend-and-backend-unit-testing-tools` for issue #28, including the subsequent Node requirement alignment. It covers configured tools, commands, initial test cases, recorded results, and remaining verification.

The [Automated Testing Strategy](../automated-testing-strategy/README.md) remains the separate Milestone 1 strategy and inherited testing baseline. Development setup and supporting-service implementation are documented in the [Milestone 2 environment implementation](../development-environment-validation/04-milestone-2-implementation.md).

## Implemented Tooling

| Area | Implementation |
| --- | --- |
| Frontend runner | Vitest `^5.0.4`, configured through `vite.config.mjs`. |
| Browser environment | jsdom `^30.1.2`, with Vitest globals enabled for the frontend. |
| Component testing | React Testing Library renders the application and queries user-visible elements. |
| DOM assertions | `@testing-library/jest-dom/vitest` loads automatically through `src/frontend/test/setup.js`. |
| Backend runner | Vitest `^5.0.4` uses its default Node environment for isolated middleware testing. |
| Commands | Both packages provide one-shot and watch scripts; root `test:all` runs both suites through the existing concurrently dependency. |
| Jest cleanup | The unused `@types/jest` dependency and ESLint Jest environment were removed. |
| Dependency records | Both package lockfiles include the test-tooling dependency changes. |

Implementation artifacts: [frontend package](../../../package.json), [backend package](../../../src/backend/package.json), [Vite configuration](../../../vite.config.mjs), [test setup](../../../src/frontend/test/setup.js), [frontend test](../../../src/frontend/tests/App.test.jsx), and [backend test](../../../src/backend/tests/auth.test.js).

### Runtime Compatibility

Vitest `^5.0.4` is installed in both packages, and jsdom `^30.1.2` supplies the frontend browser environment. The unused `@types/jest` dependency and ESLint Jest environment were removed. The frontend loads DOM assertions from `@testing-library/jest-dom/vitest` through [the test setup file](../../../src/frontend/test/setup.js).

Vitest 5 excludes Node 20, and jsdom 30 requires Node `^22.22.2 || ^24.15.0 || >=26.0.0`. Both package manifests and lockfile root entries were aligned with that range. npm remains `>=9.0.0`, and strict engine enforcement remains enabled.

## Unit-Test Workflow

| Command | Purpose |
| --- | --- |
| `npm test` | Run frontend tests once. |
| `npm --prefix src/backend test` | Run backend tests once. |
| `npm run test:all` | Run both suites once through concurrently. |
| `npm run test:watch` | Rerun affected frontend tests during development. |
| `npm --prefix src/backend run test:watch` | Rerun affected backend tests during development. |

Watch mode keeps the runner open and reruns affected tests when relevant files change. One-shot commands exit after execution and return a nonzero status on test failure. CI should run package-specific commands separately to report frontend and backend failures independently; no CI workflow is implemented yet.

Vitest was selected for the backend to share a runner and command pattern with the Vite-based frontend. Its assertions and mocking utilities support isolated unit tests without MongoDB, SMTP, or a running Express server. The initial backend test uses a mocked Express `next` callback; it does not exercise JWT verification or protected API routes.

Frontend tests belong in `src/frontend/tests/` and backend tests in `src/backend/tests/`. The frontend uses jsdom and React Testing Library; backend tests use Vitest's default Node environment. Backend success, failure, and boundary controller coverage is documented in the [backend unit testing implementation](02-backend-unit-testing-implementation.md); integration, regression, and end-to-end coverage remain separate.

## Initial Unit Test Cases

The following cases were added for issue #28. The cases use synthetic in-memory request and browser state; they do not require MongoDB, a live backend, or real email delivery.

| Test ID | Package / level | Purpose and steps | Expected result | Source |
| --- | --- | --- | --- | --- |
| UNIT-FE-001 | Frontend / unit | Run `npm test`; render `App` at the initial route inside `AuthProvider`; inspect the rendered login page. | The Professor Login heading, email field, password field, and Login button are present. | [`App.test.jsx`](../../../src/frontend/tests/App.test.jsx) |
| UNIT-BE-001 | Backend / unit | Run `npm --prefix src/backend test`; call `authenticateToken` with a request that has no authorization header. | The middleware calls `next` with an error whose message is `No token provided.`, code is `UNAUTHORIZED`, and status is 401. | [`auth.test.js`](../../../src/backend/tests/auth.test.js) |
| UNIT-CI-001 | Frontend / command verification | Temporarily change one expected frontend assertion to an incorrect value and run `npm test`; restore the assertion and rerun the command. | The temporary run exits nonzero; the restored run passes. | [`App.test.jsx`](../../../src/frontend/tests/App.test.jsx) |
| UNIT-CI-002 | Frontend + backend / command verification | Run `npm run test:all` from the repository root. | Both package suites run once, both pass, and the combined command exits successfully. | Root `package.json`, frontend and backend test results |

## Initial Test Results

These results were recorded during the initial issue #28 implementation and are preserved here from the testing-strategy document. They precede the Node requirement alignment; they are not new test runs performed while creating this document.

| Test ID | Actual result | Status |
| --- | --- | --- |
| UNIT-FE-001 | Root `npm test` reported 1 test file and 1 test passed in [`App.test.jsx`](../../../src/frontend/tests/App.test.jsx). | Passed |
| UNIT-BE-001 | `npm --prefix src/backend test` reported 1 test file and 1 test passed in [`auth.test.js`](../../../src/backend/tests/auth.test.js). | Passed |
| UNIT-CI-001 | The temporary incorrect frontend assertion failed with exit code 1. After restoration, root `npm test` reported 1 test file and 1 test passed. | Passed |
| UNIT-CI-002 | `npm run test:all` reported 1 frontend test file and 1 backend test file passed; the combined command exited with code 0. | Passed |

The initial tests verify test-runner setup and representative existing behavior. They are not a substitute for the planned integration, regression, end-to-end, health, and smoke coverage.

## Verification After Runtime Alignment

| Check | Recorded result |
| --- | --- |
| Dependency installation | Developer reported successful `npm run setup`. |
| Individual frontend and backend tests | Developer reported both suites passing. |
| Manifest and lockfile synchronization | Metadata consistency and diff whitespace checks passed. |
| Combined command and frontend failure-exit behavior | Initial results are preserved above; verification after runtime alignment has not been reported. |
| Watch mode and backend/combined failure-exit behavior | Verification has not been reported. |
| Minimum supported Node versions | Clean installation and test execution have not been reported. |

The recorded initial results predate the runtime alignment. Developer-reported local success does not establish execution in CI or compatibility across every declared Node version. The `UNIT-CI` identifiers above describe command checks, not implemented GitHub Actions jobs.

Subsequent verification for issue #85 on October 19, 2026 used Node 24.21.0
and npm 11.19.0: the existing frontend and backend suites each passed one
test. Existing cases and assertions are unchanged; the shared Prettier
baseline now includes tests, setup helpers, and manual API scripts. ESLint
checks both suites and applies `@vitest/eslint-plugin` recommended rules only
to automated test/spec files. Focused tests, invalid assertions, and duplicate
titles are errors; skipped tests warn. Helpers are imported explicitly from
Vitest. These checks do not expand test coverage. See the
[ESLint implementation record](../eslint-migration.md)
for the associated lint, formatting, build, and in-memory verification.

## Remaining Testing Work

- Verify watch-mode reruns and frontend, backend, and combined failure exit codes after runtime alignment.
- Verify clean installation and test execution on the declared minimum supported Node versions.
- Expand authentication, business-logic, integration, regression, and end-to-end coverage.
- Provide isolated MongoDB and Mailpit services, synthetic fixtures, readiness checks, and cleanup for integration tests.
- Connect package-specific commands to CI and retain test reports.
- Reconcile the Vitest implementation with FR-16, which specifies Jest, through the requirements approval process.

The [requirements tracker](../requirements-traceability-matrix/02-rtm.md) records FR-16 as In Progress. The initial unit tests do not complete its integration-testing scope.

## Related Documents

- [Automated Testing Strategy](../automated-testing-strategy/README.md)
- [Milestone 2 Development Environment Implementation](../development-environment-validation/04-milestone-2-implementation.md)
- [Repository setup and commands](../../../README.md)
