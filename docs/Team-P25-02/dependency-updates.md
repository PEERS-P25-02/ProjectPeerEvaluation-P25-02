# Dependency Updates

## Overview

Dependency changes for branch `60-migrate-frontend-build-tooling-from-create-react-app-to-vite` replace CRA tooling, remove unnecessary direct Babel dependencies, and upgrade backend email tooling. ESLint and its existing plugins remain. Configuration changes are documented in [CRA-to-Vite migration.md](CRA-to-Vite%20migration.md). The issue #28 testing additions and subsequent runtime alignment are recorded in the Unit Testing Dependencies section below.

## Changed Dependencies

| Dependency | Issue with dependency | New dependency | Why this dependency was chosen |
|---|---|---|---|
| `react-scripts` | CRA build tooling was being replaced. | `vite` `^8.3.3` | Provides the frontend development server and production build; migration checks passed. |
| React integration previously supplied by CRA | Vite needs React integration. | `@vitejs/plugin-react` `^6.1.2` | Provides JSX processing and Fast Refresh for the Vite setup. |
| `@babel/core` | No application or backend script required the direct dependency after migration. | Transformations and bundling supplied by Vite | Removes an unnecessary direct dependency while retaining the verified build. |
| `babel-eslint` | Deprecated and unused by the previous configuration. | Espree, included with ESLint | Parses the existing code and produced identical diagnostics in comparison checks. |
| `@babel/eslint-parser` (temporarily added during migration) | Comparison checks showed a separate Babel parser was unnecessary. | Espree, included with ESLint | Preserves lint results without additional Babel dependencies. |
| `eslint-config-react-app` | CRA-specific preset brought an unused TypeScript dependency chain containing vulnerable `braces`. | Explicit ESLint configuration with existing plugins | Preserves 113 verified JavaScript/React rules without the CRA preset. |
| `axios` `1.12.1` (frontend lockfile) | No package-specific issue recorded; resolved version changed during lockfile regeneration. | `axios` `1.20.0` | Resolved within the existing `^1.4.0` range; no separate selection rationale recorded. |
| `react-router-dom` `7.9.1` (frontend lockfile) | No package-specific issue recorded; resolved version changed during lockfile regeneration. | `react-router-dom` `7.18.4` | Resolved within the existing `^7.9.0` range; no separate selection rationale recorded. |
| `multer` `2.0.2` (frontend and backend lockfiles) | No package-specific issue recorded; resolved version changed during lockfile regeneration. | `multer` `2.4.0` | Resolved within the existing `^2.0.2` range; no separate selection rationale recorded. |
| `express` `4.21.2` (backend lockfile) | No package-specific issue recorded; resolved version changed during lockfile regeneration. | `express` `4.22.3` | Resolved within the existing `^4.18.2` range; no separate selection rationale recorded. |
| `mongoose` `8.18.1` (backend lockfile) | No package-specific issue recorded; resolved version changed during lockfile regeneration. | `mongoose` `8.24.5` | Resolved within the existing `^8.18.1` range; no separate selection rationale recorded. |
| `nodemailer` `^7.0.9` (manifest; base lockfile `7.0.9`) | Upgraded as part of backend dependency security work. | `nodemailer` `^10.0.15` | Existing documentation records eight passing helper/transport checks and a backend audit with zero vulnerabilities. |

## Babel Removal: Risk and Mitigation

Risk: removing Babel could break parsing or another tool that relies on it. Likelihood was low after inspecting scripts and dependency relationships.

Mitigation: compared Espree and Babel across all 62 source/configuration files using the same 113 rules. Both produced identical diagnostics: zero errors, eight warnings, and no parsing failures. No build or backend script invoked Babel. Direct Babel dependencies were then removed, and the production build passed. Vite's Oxc/Rolldown pipeline remains responsible for compilation.

## Explicit ESLint Configuration: Risk and Mitigation

Risk: removing CRA presets without a replacement leaves ESLint unconfigured or loses checks. Probability was high without mitigation.

Mitigation: applied explicit Espree configuration using the existing React, Hooks, import, and accessibility plugins. Preserved 113 rules with their options and severities, excluding unused Flow rules and TypeScript/Jest overrides. ESLint checked all 62 files with zero errors and the same eight warnings; build and whitespace checks passed.

Possible future improvement: replace the explicit 113-rule listing
with maintained shared presets and a small set of overrides. Compare
effective rules, options, severities, and lint results before switching
to avoid silently losing checks. Restoring `react-app` and
`react-app/jest` would reintroduce Babel parsing and the previously
flagged dependency chain, so that option is deferred.

## Accepted Risk: ESLint 8

**Retaining ESLint 8 is a temporary scope decision, not a Vite requirement.**
We chose to preserve the verified ESLint/plugin setup while completing
the CRA-to-Vite migration. Upgrading to supported ESLint 10 requires
separate plugin compatibility checks and configuration changes.

ESLint 8.57.1 remains in place because the current configuration passed
all 62 files with zero errors and eight existing warnings. ESLint 8 is unsupported, and its dependency chain includes deprecated packages such as `inflight`, `glob`, `rimraf`, and `@humanwhocodes` configuration packages.

Accepted risk: this tooling no longer receives upstream maintenance, and future security or compatibility issues may remain unresolved. Deprecation warnings alone do not establish an exploitable vulnerability.

Mitigation: retain the lockfile, continue dependency audits, and verify linting after changes. The current configuration passed all 62 files with zero errors and eight existing warnings. A supported ESLint/plugin upgrade is deferred to separate work.

## Nodemailer Upgrade

The original manifest declared `^7.0.9`, and the base lockfile resolved `7.0.9`. An intermediate dependency update resolved `7.0.13` before the major upgrade to `10.0.15`.

| Upgrade risk | Likelihood | Mitigation strategy |
|---|---|---|
| New version requires an unsupported Node runtime | Certain below Node 20; hosting version unverified | Local checks passed on Node 24. Confirm hosting uses Node 20+ before deployment. |
| API or message-composition changes break existing email helpers | Low based on current usage and checks | Repeat invitation, reminder, and password-reset composition and failure checks. All eight helper and transport-configuration checks passed on the new version. |
| SMTP behavior changes affect authentication or delivery | Unverified with the actual provider | Verify the provider connection and send each email type to controlled test inboxes in the testing branch before deployment. |

Strategy: compare behavior with the previous version, run the backend audit, and verify actual SMTP delivery before deployment. Real SMTP delivery remains unverified; provider connection and delivery checks are deferred to the testing branch. The backend audit reported zero vulnerabilities. Retain the previous dependency manifest and lockfile revision for rollback if verification fails.

## Verification Status

Root npm audit reported zero vulnerabilities during parser installation; the backend audit reported zero after the Nodemailer upgrade. These are results at verification time, not guarantees of security. Further browser/backend workflow testing and real SMTP delivery checks are deferred to the testing branch. Hosting runtime checks remain pending.

## Unit Testing Dependencies (#28)

| Dependency | Change | Purpose |
| --- | --- | --- |
| Vitest | Added `^5.0.4` to both packages. | Shared frontend/backend test runner with assertions, mocking, and one-shot/watch commands. |
| jsdom | Added `^30.1.2` to the frontend. | Browser environment for React component tests. |
| @types/jest | Removed from the frontend. | Tests use explicit Vitest imports. |

React Testing Library and `@testing-library/jest-dom` were already present; the frontend setup now loads the Vitest-specific DOM assertion integration. The unused ESLint Jest environment was removed. Both lockfiles record the dependency additions and removal.

Vitest 5 excludes Node 20, and jsdom 30 requires Node `^22.22.2 || ^24.15.0 || >=26.0.0`. Both manifests and lockfile root entries now declare that shared range. npm remains `>=9.0.0`, with `engine-strict=true` retained in both packages. The earlier runtime advice in the Nodemailer upgrade record describes that upgrade; hosting must satisfy the newer package requirements before deployment.

The developer reported successful `npm run setup` and both individual test suites after runtime alignment. Minimum-version installation/test checks and hosting runtime verification remain outstanding. Initial recorded command results and further verification limits are documented in [Unit Testing Implementation](testing/01-unit-testing-implementation.md). No new dependency audit result is claimed for these additions.
