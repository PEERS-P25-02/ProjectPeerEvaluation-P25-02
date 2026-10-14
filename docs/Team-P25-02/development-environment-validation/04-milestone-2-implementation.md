# Milestone 2: Development Environment Implementation

**Updated:** October 14, 2026
**Status:** In progress

## Purpose and Scope

This document records development-environment improvements implemented during Milestone 2, their verification evidence, and remaining work. The existing development-environment assessments and testing strategy preserve the inherited application baseline and the Milestone 1 plan.

The implementation described here includes the work available on branch `28-configure-frontend-and-backend-unit-testing-tools` and the local Node requirement alignment. It does not establish completion of the full Milestone 2 development environment.

## Implemented Changes

| Area | Implementation |
| --- | --- |
| Runtime requirements | Both packages require Node `^22.22.2 || ^24.15.0 || >=26.0.0` and npm `>=9.0.0`. Node 24 LTS is recommended. |
| Runtime enforcement | Both packages use `engine-strict=true`; manifest and lockfile root metadata agree. |
| Frontend tooling | Vite replaces CRA, serves development on port 3000, and builds into `build/`. Root `index.html` loads `src/index.jsx`. |
| Development commands | Root commands install dependencies and start the frontend, backend, or both. |
| Configuration template | `src/backend/.env.example` documents MongoDB, JWT, frontend URL, and SMTP settings. |
| Local configuration | `.env` and `.env.*` are ignored; example files remain tracked. The backend `.env` file was removed from tracking; existing Git history is not erased. |
| Local email | SMTP configuration supports unauthenticated Mailpit through explicit `SMTP_AUTH_REQUIRED=false`. |
| Frontend unit testing | Vitest, jsdom, React Testing Library, and DOM assertions are configured. |
| Backend unit testing | Vitest runs isolated middleware tests without starting Express or connecting to external services. |

Implementation artifacts: [frontend package](../../../package.json), [backend package](../../../src/backend/package.json), [Vite configuration](../../../vite.config.mjs), [environment template](../../../src/backend/.env.example), and [ignore rules](../../../.gitignore).

### Runtime and Dependency Alignment

Vitest `^5.0.4` is installed in both packages, and jsdom `^30.1.2` supplies the frontend browser environment. The unused `@types/jest` dependency and ESLint Jest environment were removed. The frontend loads DOM assertions from `@testing-library/jest-dom/vitest` through [the test setup file](../../../src/frontend/test/setup.js).

Vitest 5 excludes Node 20, and jsdom 30 requires Node `^22.22.2 || ^24.15.0 || >=26.0.0`. Both package manifests and lockfile root entries were aligned with that range. npm remains `>=9.0.0`, and strict engine enforcement remains enabled.

## Native Development Workflow

Run commands from the repository root.

| Command | Purpose |
| --- | --- |
| `npm run setup` | Install frontend and backend dependencies. |
| `npm run dev` | Start both development servers. |
| `npm run start:frontend` | Start Vite on port 3000. |
| `npm run start:backend` | Start Express, defaulting to port 5000. |
| `npm run build` | Generate the frontend production bundle in `build/`. |
| `npm run preview` | Preview the production frontend. |

Setup currently runs `npm install` in each package. It does not create configuration files, generate JWT secrets, or start supporting services. Maintain the separate package lockfiles and use package-specific `npm ci` commands when validating clean, reproducible installations.

Configure the backend using `.env.example`, preserve existing local values, and set a unique random JWT_SECRET. The inherited authentication code still permits a hard-coded fallback when JWT_SECRET is absent; automatic secret generation and required-secret configuration validation are not implemented. MongoDB and Mailpit must be started separately. See the [repository README](../../../README.md) for setup commands, addresses, and configuration details.

Use the development server for local API checks. Production builds and previews currently select the configured hosted backend.

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

Frontend tests belong in `src/frontend/tests/` and backend tests in `src/backend/tests/`. The frontend uses jsdom and React Testing Library; backend tests use Vitest's default Node environment. Broader authentication, business-logic, integration, regression, and end-to-end coverage remains planned.

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
| Production build after runtime alignment | Developer verification has not been reported. |
| Minimum supported Node versions | Clean installation and behavior verification has not been reported. |

Reported local results do not establish CI execution or compatibility across every declared Node version. Manual API and browser checks still require the appropriate isolated database and email services; the two initial unit tests do not require these services.

## Remaining Milestone 2 Work

- Automate safe local configuration creation and JWT secret generation.
- Implement the MongoDB-based Compose stack and application Dockerfiles; the inherited Compose configuration still uses PostgreSQL.
- Add readiness checks, isolated integration services, and cleanup.
- Expand automated coverage and connect package-specific commands to CI.
- Complete clean-install, production-build, and supported-runtime verification.
- Reconcile the Vitest implementation with FR-16, which specifies Jest, through the requirements approval process.

The live requirements tracker currently records FR-16 as In Progress. This document does not change the approved requirement or claim that unit-test tooling completes its integration-testing scope. See the [requirements tracker](../requirements-traceability-matrix/02-rtm.md).

## Related Documents

- [Inherited environment assessment](01-current-development-environment.md)
- [Milestone 1 environment plan](02-validation-and-planned-environment.md)
- [Configuration contracts](03-configuration-and-testing.md)
- [Automated Testing Strategy](../automated-testing-strategy/README.md)
- [Containerization Assessment](../containerization-assessment/README.md)
