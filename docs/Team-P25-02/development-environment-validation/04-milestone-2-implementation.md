# Milestone 2: Development Environment Implementation

**Updated:** October 19, 2026
**Status:** In progress

## Purpose and Scope

This document records development-environment improvements implemented during Milestone 2, their verification evidence, and remaining work. The existing development-environment assessments and testing strategy preserve the inherited application baseline and the Milestone 1 plan.

Unit-test tooling, commands, test cases, and recorded results introduced by issue #28 are documented separately in [Unit Testing Implementation](../testing/01-unit-testing-implementation.md). The full Milestone 2 development environment remains in progress.

## Implemented Changes

| Area | Implementation |
| --- | --- |
| Runtime requirements | Both packages require Node `^22.22.2 || ^24.15.0 || >=26.0.0` and npm `>=9.0.0`. Node 24 LTS is recommended. |
| Runtime enforcement | Both packages use `engine-strict=true`; manifest and lockfile root metadata agree. |
| Frontend tooling | Vite replaces CRA, serves development on port 3000, and builds into `build/`. Root `index.html` loads `src/index.jsx`. |
| Development commands | Root commands install dependencies and start the frontend, backend, or both. |
| Static analysis (#85) | Shared `eslint.config.mjs` applies core/import checks to both packages and React/Hooks/accessibility checks to the frontend; final lint reports zero errors and warnings. ESLint 9's support limitation is documented separately. |
| Formatting (#85) | Shared Prettier configuration sets two spaces and single-quoted JavaScript strings. Check/apply commands cover application code, tests, helpers, manual scripts, and tooling; generated output remains excluded. |
| Test linting (#85) | Vitest recommended rules apply only to automated test/spec files: focused tests, invalid assertions, and duplicate titles fail lint; skipped tests warn. Existing test cases and assertions are unchanged. |
| Configuration template | `src/backend/.env.example` documents MongoDB, JWT, frontend URL, and SMTP settings. |
| Local configuration | `.env` and `.env.*` are ignored; example files remain tracked. The backend `.env` file was removed from tracking; existing Git history is not erased. |
| Local email | SMTP configuration supports unauthenticated Mailpit through explicit `SMTP_AUTH_REQUIRED=false`. |

Implementation artifacts: [frontend package](../../../package.json), [backend package](../../../src/backend/package.json), [Vite configuration](../../../vite.config.mjs), [environment template](../../../src/backend/.env.example), and [ignore rules](../../../.gitignore).

### Runtime and Dependency Alignment

The Node requirement was raised to support the test-tooling dependencies, and both package manifests and lockfile root entries were synchronized. npm remains `>=9.0.0`, and strict engine enforcement remains enabled. See [Unit Testing Implementation](../testing/01-unit-testing-implementation.md#runtime-compatibility) for the dependency compatibility details.

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
| `npm run lint` | Check frontend, backend, tests, and tooling configuration with the shared root ESLint setup. |
| `npm run format:check` | Check application/test/tooling JavaScript and JSX formatting without edits. |
| `npm run format` | Apply the shared Prettier formatting. |
| `npm test` / `npm --prefix src/backend test` | Run the existing frontend or backend Vitest suite once. |

Setup currently runs `npm install` in each package. It does not create configuration files, generate JWT secrets, or start supporting services. Maintain the separate package lockfiles and use package-specific `npm ci` commands when validating clean, reproducible installations.

Configure the backend using `.env.example`, preserve existing local values, and set a unique random JWT_SECRET. The inherited authentication code still permits a hard-coded fallback when JWT_SECRET is absent; automatic secret generation and required-secret configuration validation are not implemented. MongoDB and Mailpit must be started separately. See the [repository README](../../../README.md) for setup commands, addresses, and configuration details.

Use the development server for local API checks. Production builds and previews currently select the configured hosted backend.

## Verification After Runtime Alignment

| Check | Recorded result |
| --- | --- |
| Dependency installation | Developer reported successful `npm run setup`. |
| Manifest and lockfile synchronization | Metadata consistency and diff whitespace checks passed. |
| Lint and formatting (#85, Node 24.21.0/npm 11.19.0) | Both passed; lint reported zero errors and zero warnings. Backend uses the shared root tooling. |
| Production build (#85, Node 24.21.0/npm 11.19.0) | Passed; JavaScript bundle 651.02 kB, with the existing >500 kB chunk warning. |
| Existing unit suites (#85) | Frontend and backend each passed their existing single test. Test files share the formatter baseline; assertions and cases are unchanged. |
| Minimum supported Node versions | Clean installation and behavior verification have not been reported. |

Testing verification and recorded results are maintained in [Unit Testing Implementation](../testing/01-unit-testing-implementation.md#verification-after-runtime-alignment). Manual API and browser checks still require the appropriate isolated database and email services.

## Remaining Development Environment Work

- Automate safe local configuration creation and JWT secret generation.
- Implement the MongoDB-based Compose stack and application Dockerfiles; the inherited Compose configuration still uses PostgreSQL.
- Add supporting-service readiness checks and isolated configuration.
- Complete clean-install and minimum-supported-runtime verification, plus hosting validation; local Node 24 build evidence is recorded above.
- Add CI lint, formatting, build, and unit-test jobs; the current workflow validates dependency installation only.
- Revisit supported ESLint releases once React, import, and accessibility plugins declare ESLint 10 compatibility.

## Related Documents

- [Inherited environment assessment](01-current-development-environment.md)
- [Milestone 1 environment plan](02-validation-and-planned-environment.md)
- [Configuration contracts](03-configuration-and-testing.md)
- [Unit Testing Implementation](../testing/01-unit-testing-implementation.md)
- [ESLint and Formatting Implementation (#85)](../eslint-migration.md)
- [Containerization Assessment](../containerization-assessment/README.md)
