# Dependency Updates

## Overview

Dependency changes for branch `60-migrate-frontend-build-tooling-from-create-react-app-to-vite` replace CRA tooling, remove unnecessary direct Babel dependencies, and upgrade backend email tooling. Configuration changes are documented in [CRA-to-Vite migration.md](CRA-to-Vite%20migration.md). The issue #28 testing additions and subsequent runtime alignment are recorded in the Unit Testing Dependencies section below. Issue #85 subsequently upgrades ESLint to 9.39.5 and moves its configuration into `eslint.config.mjs`; see the [migration record](eslint-migration.md) for compatibility and support limitations.

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

## Historical Explicit ESLint Configuration: Risk and Mitigation

Risk: removing CRA presets without a replacement leaves ESLint unconfigured or loses checks. Probability was high without mitigation.

Mitigation: applied explicit Espree configuration using the existing React, Hooks, import, and accessibility plugins. Preserved 113 rules with their options and severities, excluding unused Flow rules and TypeScript/Jest overrides. ESLint checked all 62 files with zero errors and the same eight warnings; build and whitespace checks passed.

Issue #85 subsequently replaced the inline 113-rule listing with maintained
core, React, Hooks, import, and accessibility presets plus explicit project
overrides. Rule names, options, severities, and diagnostics were compared
before the approved policy changes. Current lint reports zero errors and
zero warnings. See the [ESLint migration record](eslint-migration.md) for the
comparison and intentional differences. CRA presets were not restored.

## Historical Accepted Risk: ESLint 8

The following records the CRA migration decision. Issue #85 replaces ESLint 8
with 9.39.5 and a native flat configuration. ESLint 9 is also end-of-life;
the current support limitation and plugin compatibility constraints are
documented in the [ESLint migration record](eslint-migration.md).

**Retaining ESLint 8 is a temporary scope decision, not a Vite requirement.**
We chose to preserve the verified ESLint/plugin setup while completing
the CRA-to-Vite migration. Upgrading to supported ESLint 10 requires
separate plugin compatibility checks and configuration changes.

ESLint 8.57.1 was retained at that stage because its configuration passed
all 62 files with zero errors and eight existing warnings. ESLint 8 was
unsupported, and its dependency chain included deprecated packages such as
`inflight`, `glob`, `rimraf`, and `@humanwhocodes` configuration packages.

Accepted risk: this tooling no longer receives upstream maintenance, and future security or compatibility issues may remain unresolved. Deprecation warnings alone do not establish an exploitable vulnerability.

The mitigation at that stage was to retain the lockfile, continue dependency
audits, and verify linting after changes. The supported-release goal remains
limited by plugin compatibility after the ESLint 9 upgrade; current evidence
is recorded separately below.

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

## ESLint Dependencies (#85)

| Dependency | Change | Purpose |
| --- | --- | --- |
| ESLint | `^8.57.0` (resolved 8.57.1) to `^9.39.5`. | Newest compatible major for the existing published plugins; native flat configuration. ESLint 9 remains unsupported upstream. |
| `@eslint/js` | Add `^9.39.5` directly. | Supplies the core recommended preset imported by the flat configuration. |
| `globals` | Add `^17.13.0` directly. | Explicit browser and Node global definitions replace legacy `env`. |
| `eslint-import-resolver-typescript` | Add `^4.4.5`. | Resolves JavaScript/JSX and package exports for import checks, including Vite's ESM entry points. No TypeScript application migration is involved. |
| `eslint-config-prettier` | Add `^10.1.8`. | Disables formatting rules after the lint presets so Prettier owns formatting. |
| `@vitest/eslint-plugin` | Add `^1.6.27`. | Recommended Vitest checks scoped to automated test/spec files. Its ESLint utility dependencies bring TypeScript tooling transitively; application files still use JavaScript and Espree. |
| `@eslint/eslintrc` | Remove the direct `^3.3.1` dependency. | No `FlatCompat` adapter is needed. ESLint still brings this package transitively. |

React 7.37.5, Hooks 5.2.0, import 2.32.0, and accessibility 6.10.2 remain
unchanged. The root lockfile changes the ESLint/global dependency tree and
adds the preset, resolver, Vitest lint, and Prettier integration dependencies;
backend dependencies and its lockfile are unchanged. See the
[migration record](eslint-migration.md) for the implementation, preset
comparison, resolved warnings, and validation. Prettier was already installed;
`prettier.config.cjs`, `.prettierignore`, and the `format`/`format:check`
commands now define its shared application/test/tooling baseline. Automated
tests, setup helpers, and manual API scripts are included in formatting;
test cases and assertions are unchanged.

The Vitest lint plugin's recommended preset adds 17 active rules to matching
test/spec files. Focused tests, invalid assertions, and duplicate titles are
explicitly errors; skipped tests are warnings. Ordinary application code,
setup helpers, and the manual API script do not receive the Vitest preset.
Installation resolves TypeScript 6.0.3 and `@typescript-eslint` utilities as
tooling dependencies; no TypeScript parser or project configuration is added.
An existing ESLint utility also resolves from 4.9.0 to 4.10.1 within its range.

The sample-data script's undeclared `uuid` dependency was replaced by
`randomUUID()` from Node's built-in `node:crypto`; no UUID package was added.
Final checks on Node 24.21.0/npm 11.19.0 reported zero lint errors and warnings,
passing formatting, passing production build, and one passing existing test
per package. The build's >500 kB chunk warning remains. No new dependency audit
or multi-runtime result is claimed for #85.
