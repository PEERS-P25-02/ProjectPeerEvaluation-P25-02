# Milestone 2: Development Environment Implementation

**Updated:** October 20, 2026
**Status:** In progress

## Purpose and Scope

This document records development-environment improvements implemented during Milestone 2, their verification evidence, and remaining work. The existing development-environment assessments and testing strategy preserve the inherited application baseline and the Milestone 1 plan.

Unit-test tooling, commands, test cases, and recorded results are documented separately in [Unit Testing Implementation](testing/unit-testing.md). The full Milestone 2 development environment remains in progress.

## Implemented Changes

| Area | Implementation |
| --- | --- |
| Runtime requirements | Both packages require Node `^22.22.2 || ^24.15.0 || >=26.0.0` and npm `>=9.0.0`. Node 24 LTS is recommended. |
| Runtime enforcement | Both packages use `engine-strict=true`; manifest and lockfile root metadata agree. |
| Frontend tooling | Vite replaces CRA, serves development on port 3000, and builds into `build/`. Root `index.html` loads `src/index.jsx`. |
| Development commands | Root commands install dependencies and start the frontend, backend, or both. |
| Static analysis | Shared `eslint.config.mjs` applies core/import checks to both packages and React/Hooks/accessibility checks to the frontend; final lint reports zero errors and warnings. ESLint 9's support limitation is documented separately. |
| Formatting | Shared Prettier configuration sets two spaces and single-quoted JavaScript strings. Check/apply commands cover application code, tests, helpers, manual scripts, and tooling; generated output remains excluded. |
| Test linting | Vitest recommended rules apply only to automated test/spec files: focused tests, invalid assertions, and duplicate titles fail lint; skipped tests warn. Existing test cases and assertions are unchanged. |
| Configuration template | `.env.example` documents MongoDB, JWT, frontend URL, and SMTP settings. |
| Local configuration | The backend and maintenance scripts load the root `.env` independently of the working directory; process environment variables take precedence. `.env` and `.env.*` are ignored, while example files remain tracked. |
| Setup automation | `npm run setup:env` adds missing settings and generates a missing or placeholder JWT secret while preserving existing root configuration. |
| Compose stack | Frontend, backend, MongoDB, and Mailpit use production application builds, health checks, startup ordering, localhost ports, and persistent MongoDB storage. |
| Local email | SMTP configuration supports unauthenticated Mailpit through explicit `SMTP_AUTH_REQUIRED=false`. |

Implementation artifacts: [frontend package](../../../../package.json), [backend package](../../../../src/backend/package.json), [Vite configuration](../../../../vite.config.mjs), [environment template](../../../../.env.example), and [ignore rules](../../../../.gitignore).

### Runtime and Dependency Alignment

The Node requirement was raised to support the test-tooling dependencies, and both package manifests and lockfile root entries were synchronized. npm remains `>=9.0.0`, and strict engine enforcement remains enabled. See [Unit Testing Implementation](testing/unit-testing.md#runtime-compatibility) for the dependency compatibility details.

## Native Development Workflow

Run commands from the repository root.

| Command | Purpose |
| --- | --- |
| `npm run setup` | Install frontend and backend dependencies and prepare the root `.env`. |
| `npm run setup:env` | Prepare local configuration without reinstalling dependencies. |
| `npm run dev` | Start both development servers. |
| `npm run start:frontend` | Start Vite on port 3000. |
| `npm run start:backend` | Start Express, defaulting to port 5000. |
| `npm run build` | Generate the frontend production bundle in `build/`. |
| `npm run preview` | Preview the production frontend. |
| `npm run lint` | Check frontend, backend, tests, and tooling configuration with the shared root ESLint setup. |
| `npm run format:check` | Check application/test/tooling JavaScript and JSX formatting without edits. |
| `npm run format` | Apply the shared Prettier formatting. |
| `npm test` / `npm --prefix src/backend test` | Run the existing frontend or backend Vitest suite once. |

Setup runs `npm install` in each package, then prepares the root `.env` from `.env.example`. It preserves configured root values, adds missing settings, and generates a random JWT secret when missing or set to a recognized placeholder. It does not start supporting services. Maintain the separate package lockfiles and use package-specific `npm ci` commands when validating clean, reproducible installations.

For native execution, the root `.env` defaults to MongoDB at `localhost:27017`, Mailpit at `localhost:1025`, and `FRONTEND_URL=http://localhost:3000`. MongoDB and Mailpit must already be reachable. The inherited authentication code still permits a hard-coded fallback when JWT_SECRET is absent; setup generates a secret and Compose rejects a missing or empty secret. See [Getting Started](../../getting-started.md) for setup commands and addresses, and the [local development guide](../../developer-guides/local-development.md) for configuration details.

Use the development server for local API checks. Production builds and previews default to the hosted backend unless `VITE_API_BASE_URL` is supplied at build time.

## Docker Compose Workflow

Requires Docker Compose v2.24 or newer. After initial dependency setup, run these commands from the repository root:

| Command | Purpose |
| --- | --- |
| `npm run docker:up` | Prepare the root `.env`, build the images, and wait for healthy services. |
| `npm run docker:ps` | Inspect service status and health. |
| `npm run docker:logs` | Follow service logs. |
| `npm run docker:down` | Remove the containers and network while retaining MongoDB data. |

Open the frontend at http://localhost:3000 and Mailpit at http://localhost:8025. Rerun `npm run docker:up` after source changes to rebuild the application images.

The backend imports the optional root `.env` and overrides native database and SMTP settings with container addresses: `mongodb://mongodb:27017/peer-eval` and `mailpit:1025`. SMTP provider presets and credentials are cleared so local email stays in Mailpit. The backend uses `NODE_ENV=production` and `PORT=5000`; `FRONTEND_URL` stays browser-reachable for email links.

MongoDB and Mailpit must be healthy before backend startup. The frontend waits for `/api/health`, which returns HTTP 200 when MongoDB is connected and 503 otherwise. Compose builds the frontend with `VITE_API_BASE_URL=/api` and mounts `nginx/compose.conf` to proxy browser API requests to `backend:5000`. Published ports bind to localhost, and a named volume persists MongoDB data.

CI can supply an ephemeral `JWT_SECRET` through the job environment and invoke `docker compose -p peers-ci up --build --wait --wait-timeout 120` directly without a root `.env`. Use an isolated runner because host ports are fixed, and always run `docker compose -p peers-ci down --volumes`, including after failure. Automated CI jobs that exercise this stack remain separate work.

## Verification After Runtime Alignment

| Check | Recorded result |
| --- | --- |
| Dependency installation | Developer reported successful `npm run setup`. |
| Manifest and lockfile synchronization | Metadata consistency and diff whitespace checks passed. |
| Lint and formatting (Node 24.21.0/npm 11.19.0) | Both passed; lint reported zero errors and zero warnings. Backend uses the shared root tooling. |
| Production build (Node 24.21.0/npm 11.19.0) | Passed; JavaScript bundle 651.02 kB, with the existing >500 kB chunk warning. |
| Existing unit suites | Frontend and backend each passed their existing single test. Test files share the formatter baseline; assertions and cases are unchanged. |
| Minimum supported Node versions | Clean installation and behavior verification have not been reported. |

Testing verification and recorded results are maintained in [Unit Testing Implementation](testing/unit-testing.md#verification-after-runtime-alignment). Manual API and browser checks still require the appropriate isolated database and email services.

## Compose Verification

Recorded runtime checks used synthetic data with Docker Engine 29.4.0 and Compose 5.1.1. They covered healthy startup, HTTP proxy and SPA routing, registration/login, protected API access, Mailpit capture with local email links, HTTP 503 during a database outage, and account persistence after down/up. The disposable containers and database volume were removed afterward.

Automated email integration suites and CI jobs that exercise the stack remain separate work. Password-reset routing and response-contract defects remain tracked in [Known Bugs](../../known-bugs.md); full password-reset completion is not claimed.

## Remaining Development Environment Work

- Add automated email integration suites and CI jobs that exercise the Compose stack.
- Complete clean-install and minimum-supported-runtime verification, plus hosting validation; local Node 24 build evidence is recorded above.
- The current [CI workflow](../../../../.github/workflows/ci.yml) defines eight jobs for dependency installation, frontend build, lint, frontend and backend unit tests, coverage reports, and formatting. It does not run the local integration suite or security scans; repository branch-protection settings are not established by the workflow file.
- Revisit supported ESLint releases once React, import, and accessibility plugins declare ESLint 10 compatibility.

## Related Documents

- [Inherited environment assessment](../../inherited-application/development-environment/01-current-development-environment.md)
- [Milestone 1 environment plan](../plans/development-environment/01-planned-environment.md)
- [Configuration contracts](../plans/development-environment/02-configuration-and-testing-plan.md)
- [Unit Testing Implementation](testing/unit-testing.md)
- [ESLint and Formatting Implementation](tooling/eslint-and-formatting.md)
- [Containerization Assessment](../plans/containerization/README.md)
