# Milestone 2: Unit Testing Implementation

**Updated:** October 31, 2026
**Status:** Frontend and backend unit-test suites are implemented. Integration and end-to-end tests are separate layers.

## Purpose and Scope

This document describes the unit-testing tools, commands, cases, and current verification results.

The [Automated Testing Strategy](../../plans/automated-testing-strategy/README.md) remains the separate Milestone 1 strategy and inherited testing baseline. Development setup and supporting-service implementation are documented in the [Milestone 2 environment implementation](../development-environment.md).

## Testing Strategy

### Implemented Tooling

| Area | Implementation |
| --- | --- |
| Frontend runner | Vitest `^5.0.5`, configured through `vite.config.mjs`. |
| Browser environment | jsdom `^30.1.3`, with Vitest globals enabled for the frontend. |
| Component testing | React Testing Library renders the application and queries user-visible elements. |
| DOM assertions | `@testing-library/jest-dom/vitest` loads automatically through `src/frontend/test/setup.js`. |
| Backend runner | Vitest `^5.0.5` uses its default Node environment for isolated unit testing. |
| Commands | Both packages provide one-shot and watch scripts; root `test:all` runs both suites through the existing concurrently dependency. |
| Jest cleanup | The unused `@types/jest` dependency and ESLint Jest environment were removed. |
| Dependency records | Both package lockfiles include the test-tooling dependency changes. |

Implementation artifacts include the [frontend package](../../../../../package.json), [backend package](../../../../../src/backend/package.json), [Vite configuration](../../../../../vite.config.mjs), [test setup](../../../../../src/frontend/test/setup.js), frontend tests in `src/frontend/tests/`, and the [backend test](../../../../../src/backend/tests/auth.test.js).

### Runtime Compatibility

Vitest `^5.0.5` is listed in both packages, and jsdom `^30.1.3` supplies the frontend browser environment. The unused `@types/jest` dependency and ESLint Jest environment were removed. The frontend loads DOM assertions from `@testing-library/jest-dom/vitest` through [the test setup file](../../../../../src/frontend/test/setup.js).

Vitest 5 excludes Node 20, and jsdom 30 requires Node `^22.22.2 || ^24.15.0 || >=26.0.0`. Both package manifests and lockfile root entries were aligned with that range. npm remains `>=9.0.0`, and strict engine enforcement remains enabled.

### Unit-Test Workflow

| Command | Purpose |
| --- | --- |
| `npm test` | Run frontend tests once. |
| `npm --prefix src/backend test` | Run backend tests once. |
| `npm run test:all` | Run both suites once through concurrently. |
| `npm run test:watch` | Rerun affected frontend tests during development. |
| `npm --prefix src/backend run test:watch` | Rerun affected backend tests during development. |

Watch mode keeps the runner open and reruns affected tests when relevant files change. One-shot commands exit after execution and return a nonzero status on test failure. CI runs package-specific commands separately.

Vitest was selected for the backend to share a runner and command pattern with the Vite-based frontend. Its assertions and mocking utilities support isolated unit tests without MongoDB, SMTP, or a running Express server.

Frontend tests belong in `src/frontend/tests/` and backend tests in `src/backend/tests/`. The frontend uses jsdom and React Testing Library; backend tests use Vitest's default Node environment. Backend success, failure, and boundary controller coverage is documented in the [backend unit testing implementation](backend-unit-testing.md); integration, regression, and end-to-end coverage remain separate.

## Test Cases

| Package | Case groups | Detailed record |
| --- | --- | --- |
| Frontend | Login and authentication, course and team management, evaluation, reports, settings, and API service behavior. | [Frontend unit validation](frontend-unit-test-validation.md) |
| Backend | Authentication and authorization, controller success and failure paths, validation, roster CSV parsing, evaluation submission, reporting, models, and workflow transitions. | [Backend unit testing](backend-unit-testing.md) |

The following cases were added during the initial unit-testing setup. The cases use synthetic in-memory request and browser state and do not require MongoDB, a live backend, or real email delivery.

| Test ID | Package / level | Purpose and steps | Expected result | Source |
| --- | --- | --- | --- | --- |
| UNIT-FE-001 | Frontend / unit | Run `npm test`; render `App` at the initial route inside `AuthProvider`; inspect the rendered login page. | The Professor Login heading, email field, password field, and Login button are present. | [`LoginPage.test.jsx`](../../../../../src/frontend/tests/LoginPage.test.jsx) |
| UNIT-BE-001 | Backend / unit | Run `npm --prefix src/backend test`; call `authenticateToken` with a request that has no authorization header. | The middleware calls `next` with an error whose message is `No token provided.`, code is `UNAUTHORIZED`, and status is 401. | [`auth.test.js`](../../../../../src/backend/tests/auth.test.js) |
| UNIT-CI-001 | Frontend / command verification | Temporarily change one expected frontend assertion to an incorrect value and run `npm test`; restore the assertion and rerun the command. | The temporary run exits nonzero; the restored run passes. | [`LoginPage.test.jsx`](../../../../../src/frontend/tests/LoginPage.test.jsx) |
| UNIT-CI-002 | Frontend + backend / command verification | Run `npm run test:all` from the repository root. | Both package suites run once, both pass, and the combined command exits successfully. | Root `package.json`, frontend and backend test results |

## Test Results

Verified October 31, 2026 at revision `d0088f7`. Clean `npm ci`
installations for both packages and both unit suites passed on Node
22.22.2, 24.15.0, and 26.0.0 in isolated copies. The suites did not
require application services.

| Date | Command | Recorded outcome | Evidence |
| --- | --- | --- | --- |
| October 31, 2026 | `npm test` | 10 frontend files, 85 tests passed. | Local command output |
| October 31, 2026 | `npm --prefix src/backend test` | 16 backend files, 143 tests passed. | Local command output |

These unit results do not establish complete functional regression coverage.

The earlier `UNIT-CI-001` verification confirmed that a deliberately
incorrect frontend assertion caused a failure and that the test passed
after the assertion was restored. This check was not repeated in the
October 31 run.

## Frontend Unit Test Coverage

The frontend suite uses Vitest and React Testing Library. Detailed
case mappings and verification are in
[Frontend Unit Test Validation](frontend-unit-test-validation.md).

The test files include:

- `LoginPage.test.jsx`
- `AuthContext.test.jsx`
- `ApiService.test.js`
- `Settings.test.jsx`
- `StudentEvaluation.test.jsx`
- `TeamAssignment.test.jsx`
- `Reports.test.jsx`
- `CourseManagement.test.jsx`
- `CourseManagement.resetSequencing.test.jsx`

These files are in `src/frontend/tests/`. The suite also includes
`src/frontend/test/setup.test.js`.

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

Mocks are used when needed so the frontend unit tests do not require the real backend, MongoDB, or email service. This helps keep the tests repeatable.

Some tests intentionally create error conditions, such as invalid evaluation links or failed API requests. These tests may print expected error messages in the terminal. Existing MUI Grid code may also print migration warnings. These messages did not cause the test suite to fail.

Detailed verification is recorded in [03-frontend-unit-test-validation.md](frontend-unit-test-validation.md).

## Remaining Testing Work

- Verify watch-mode reruns and frontend, backend, and combined failure exit codes where needed.
- Continue expanding business-logic, integration, regression, and end-to-end coverage.
- Reconcile the Vitest implementation with FR-16, which specifies Jest, through the requirements approval process.

The [integration environment](integration-test-environment.md) and
[CI implementation record](../continuous-integration.md) describe the
implemented services, commands, and retained evidence.

The [requirements tracker](../../../requirements/traceability/02-rtm.md) records FR-16 as In Progress. FR-16 specifies Jest, while the implementation uses Vitest; this conflict remains open and the requirement text is unchanged. The frontend unit tests improve frontend coverage but do not complete the integration-testing scope.

## Related Documents

- [Automated Testing Strategy](../../plans/automated-testing-strategy/README.md)
- [Milestone 2 Development Environment Implementation](../development-environment.md)
- [Frontend Unit Test Validation](frontend-unit-test-validation.md)
- [Getting started](../../../getting-started.md)