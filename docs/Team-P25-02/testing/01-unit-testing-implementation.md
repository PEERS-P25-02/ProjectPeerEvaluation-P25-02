# Milestone 2: Unit Testing Implementation

**Updated:** October 21, 2026
**Status:** Unit-test tooling, Issue #30 frontend coverage, and backend success, failure, and boundary coverage implemented; integration and end-to-end coverage remain separate

## Purpose and Scope

This document records testing implementation completed for the PEERS project. It covers the configured testing tools, commands, initial test cases, recorded results, and expanded frontend unit-test coverage.

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

Implementation artifacts include the [frontend package](../../../package.json), [backend package](../../../src/backend/package.json), [Vite configuration](../../../vite.config.mjs), [test setup](../../../src/frontend/test/setup.js), frontend tests in `src/frontend/tests/`, and the [backend test](../../../src/backend/tests/auth.test.js).

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

Watch mode keeps the runner open and reruns affected tests when relevant files change. One-shot commands exit after execution and return a nonzero status on test failure. CI should run package-specific commands separately to report frontend and backend failures independently.

Vitest was selected for the backend to share a runner and command pattern with the Vite-based frontend. Its assertions and mocking utilities support isolated unit tests without MongoDB, SMTP, or a running Express server.

Frontend tests belong in `src/frontend/tests/` and backend tests in `src/backend/tests/`. The frontend uses jsdom and React Testing Library; backend tests use Vitest's default Node environment. Backend success, failure, and boundary controller coverage is documented in the [backend unit testing implementation](02-backend-unit-testing-implementation.md); integration, regression, and end-to-end coverage remain separate.

## Initial Unit Test Cases

The following cases were added during the initial unit-testing setup. The cases use synthetic in-memory request and browser state and do not require MongoDB, a live backend, or real email delivery.

| Test ID | Package / level | Purpose and steps | Expected result | Source |
| --- | --- | --- | --- | --- |
| UNIT-FE-001 | Frontend / unit | Run `npm test`; render `App` at the initial route inside `AuthProvider`; inspect the rendered login page. | The Professor Login heading, email field, password field, and Login button are present. | [`LoginPage.test.jsx`](../../../src/frontend/tests/LoginPage.test.jsx) |
| UNIT-BE-001 | Backend / unit | Run `npm --prefix src/backend test`; call `authenticateToken` with a request that has no authorization header. | The middleware calls `next` with an error whose message is `No token provided.`, code is `UNAUTHORIZED`, and status is 401. | [`auth.test.js`](../../../src/backend/tests/auth.test.js) |
| UNIT-CI-001 | Frontend / command verification | Temporarily change one expected frontend assertion to an incorrect value and run `npm test`; restore the assertion and rerun the command. | The temporary run exits nonzero; the restored run passes. | [`LoginPage.test.jsx`](../../../src/frontend/tests/LoginPage.test.jsx) |
| UNIT-CI-002 | Frontend + backend / command verification | Run `npm run test:all` from the repository root. | Both package suites run once, both pass, and the combined command exits successfully. | Root `package.json`, frontend and backend test results |

## Initial Test Results

These results were recorded during the initial testing implementation. They are kept here as the starting testing baseline.

| Test ID | Actual result | Status |
| --- | --- | --- |
| UNIT-FE-001 | Root `npm test` reported 1 frontend test file and 1 test passed. | Passed |
| UNIT-BE-001 | `npm --prefix src/backend test` reported 1 backend test file and 1 test passed. | Passed |
| UNIT-CI-001 | The temporary incorrect frontend assertion failed. After restoration, the frontend test passed. | Passed |
| UNIT-CI-002 | `npm run test:all` reported the frontend and backend test suites passed. | Passed |

The initial tests verified the test-runner setup and basic existing behavior. They were not meant to provide complete frontend or backend coverage.

## Verification After Runtime Alignment

| Check | Recorded result |
| --- | --- |
| Dependency installation | Developer reported successful `npm run setup`. |
| Individual frontend and backend tests | Developer reported both suites passing. |
| Manifest and lockfile synchronization | Metadata consistency and diff whitespace checks passed. |
| Combined command and frontend failure-exit behavior | Initial results are preserved above. |
| Watch mode and backend/combined failure-exit behavior | Additional verification remains available for future work. |
| Minimum supported Node versions | Clean installation and testing across all declared supported Node versions has not been fully verified. |

Subsequent verification for issue #85 on October 19, 2026 used Node 24.21.0 and npm 11.19.0. The existing frontend and backend suites each passed one test at that time.

The shared Prettier baseline includes tests, setup helpers, and manual API scripts. ESLint checks both suites and applies `@vitest/eslint-plugin` recommended rules to automated test/spec files. Focused tests, invalid assertions, and duplicate titles are errors. Skipped tests produce warnings.

See the [ESLint implementation record](../eslint-migration.md) for the related lint, formatting, build, and in-memory verification.

## Issue #30 Frontend Unit Test Coverage

Issue #30 expanded the frontend unit-test coverage for PEERS using Vitest and React Testing Library.

The frontend tests are located in `src/frontend/tests/` and now cover several important parts of the PEERS frontend.

The test files include:

- `LoginPage.test.jsx`
- `AuthContext.test.jsx`
- `ApiService.test.js`
- `Settings.test.jsx`
- `StudentEvaluation.test.jsx`
- `TeamAssignment.test.jsx`
- `Reports.test.jsx`
- `CourseManagement.test.jsx`

The tests cover:

- professor login form behavior;
- successful login submission;
- professor registration;
- switching between login and registration;
- clearing form fields when switching modes;
- password reset success;
- password reset failure;
- canceling a password reset;
- saving a logged-in user;
- restoring a saved user;
- logging out a user;
- API requests and authentication headers;
- loading and adding flagged words in Settings;
- Settings loading errors;
- student evaluation loading;
- invalid evaluation links;
- completed student evaluations;
- the current Team Assignment page;
- Reports page course loading;
- active-course filtering in Reports;
- Reports loading errors;
- Course Management course loading;
- refreshed course information;
- empty Course Management results;
- Course Management loading errors.

The frontend suite was run with:

```bash
npm test
```

Recorded result:

```text
Test Files  8 passed (8)
Tests       29 passed (29)
```

All 29 frontend tests passed.

The frontend test folder was also checked with ESLint:

```bash
npx eslint src/frontend/tests
```

ESLint completed with no errors.

The frontend test files were checked with Prettier:

```bash
npx prettier --check "src/frontend/tests/**/*.{js,jsx}"
```

Prettier reported:

```text
All matched files use Prettier code style!
```

Mocks are used when needed so the frontend unit tests do not require the real backend, MongoDB, or email service. This helps keep the tests repeatable.

Some tests intentionally create error conditions, such as invalid evaluation links or failed API requests. These tests may print expected error messages in the terminal. Existing MUI Grid code may also print migration warnings. These messages did not cause the test suite to fail.

Detailed verification is recorded in [03-frontend-unit-test-validation.md](03-frontend-unit-test-validation.md).

## Remaining Testing Work

- Verify watch-mode reruns and frontend, backend, and combined failure exit codes where needed.
- Verify clean installation and test execution on the declared minimum supported Node versions.
- Continue expanding business-logic, integration, regression, and end-to-end coverage.
- Provide isolated MongoDB and Mailpit services, synthetic fixtures, readiness checks, and cleanup for integration tests.
- Connect package-specific commands to CI and retain test reports.
- Reconcile the Vitest implementation with FR-16, which specifies Jest, through the requirements approval process.

The [requirements tracker](../requirements-traceability-matrix/02-rtm.md) records FR-16 as In Progress. The frontend unit tests improve frontend coverage but do not complete the integration-testing scope.

## Related Documents

- [Automated Testing Strategy](../automated-testing-strategy/README.md)
- [Milestone 2 Development Environment Implementation](../development-environment-validation/04-milestone-2-implementation.md)
- [Frontend Unit Test Validation](03-frontend-unit-test-validation.md)
- [Repository setup and commands](../../../README.md)