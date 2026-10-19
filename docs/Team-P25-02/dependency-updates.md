# Dependency Updates

## Overview

Dependency changes for branch `60-migrate-frontend-build-tooling-from-create-react-app-to-vite` replace CRA tooling, remove unnecessary direct Babel dependencies, and upgrade backend email tooling. Configuration changes are documented in [CRA-to-Vite migration.md](CRA-to-Vite%20migration.md). The issue #28 testing additions and subsequent runtime alignment are recorded in the Unit Testing Dependencies section below. Issue #85 subsequently upgrades ESLint to 9.39.5 and moves its configuration into `eslint.config.mjs`; see the [migration record](eslint-migration.md) for compatibility and support limitations.

The Dependabot configuration, reviewed updates, and verification limits for #62 are recorded in [Dependabot and Reviewed Updates](#dependabot-and-reviewed-updates-62).

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

## Dependabot and Reviewed Updates (#62)

Recorded on 2026-10-18 for branch `62-configure-dependabot-and-establish-dependency-maintenance`. The migration and unit-testing sections above are historical records; the results below describe this maintenance work separately.

### Dependabot Configuration

Added [`.github/dependabot.yml`](../../.github/dependabot.yml) with separate npm entries for `/` and `/src/backend`, covering each package's manifest and lockfile.

- Version checks run weekly on Monday at 09:00, `America/New_York`.
- Each entry allows three open version-update PRs, for six across the two entries.
- Minor and patch version updates are grouped separately for production and development dependencies in each package. These classifications follow `dependencies` and `devDependencies`; they do not establish runtime exposure.
- Major upgrades remain eligible for individual PRs and require explicit compatibility review.
- Groups explicitly apply to version updates. Security-update PRs use GitHub's separate limit and require repository security settings to be enabled.

The file parsed successfully, and both package paths, schedules, limits, and four groups were checked locally. Hosted Dependabot execution, the GitHub alert list, dependency-graph visibility, and alerts/security-update settings were not verified. The configuration must reach the default branch before hosted version-update behavior can be verified. A local npm audit is separate from a hosted Dependabot run.

### Reviewed Package Changes

The root manifest was updated to match the reviewed ranges from the supplied reference manifest. The frontend lockfile was generated through npm and reviewed before applying each batch.

| Package | Manifest range before -> after | Locked version before -> after |
| --- | --- | --- |
| `@testing-library/react` | `^16.3.0` -> `^16.3.3` | `16.3.0` -> `16.3.3` |
| `@testing-library/user-event` | `^14.4.3` -> `^14.6.7` | `14.6.1` -> `14.6.8` |
| `react` | `^19.1.1` -> `^19.3.0` | `19.1.1` -> `19.3.1` |
| `react-dom` | `^19.1.1` -> `^19.3.0` | `19.1.1` -> `19.3.1` |
| `prettier` | `^3.0.0` -> `^3.9.9` | `3.6.2` -> `3.9.10` |
| `concurrently` | `^7.6.0` -> `^10.0.5` | `7.6.0` -> `10.0.6` |

Caret ranges allowed the newer patch versions recorded in the lockfile. React's transitive `scheduler` changed from `0.26.0` to `0.28.0`. The separately reviewed `concurrently` major upgrade also updated its CLI dependency tree. Its declared Node requirement is `>=22`, which fits the project's existing engine range. The v10 release is ESM-only; this application invokes its CLI through npm scripts.

No backend manifest or lockfile changes were introduced by this maintenance work. Existing packages were not removed or moved between dependency sections. Vitest remains at `^5.0.4`; the reference's `^5.0.3` would lower its minimum. MUI, ESLint, and React Hooks plugin major upgrades were discussed but not applied. No lint configuration or application-source changes were made.

### Verification and Limits

Commands ran with Node `24.21.0` and npm `11.19.0`. Results apply to the stated stage, rather than proving every later dependency tree passed.

| Check | Recorded result and stage |
| --- | --- |
| Baseline frontend and backend audits | Both lockfile audits, including development dependencies, reported zero known vulnerabilities before the reviewed updates. |
| YAML dependency inspection | `npm explain yaml` and `npm ls yaml --all` resolved `yaml@1.10.3` through Emotion -> Babel macros -> cosmiconfig. The baseline audit reported no finding for it. |
| Clean installation | Root `npm ci` succeeded after the same-major batch and again after the `concurrently` upgrade. |
| Production build | Passed after the same-major batch using `npm run build -- --outDir /tmp/peers-62-minor-build`. Output went outside the checkout to preserve existing build assets. The bundle-size warning remained. |
| Frontend unit test | `npm test` passed one test after the same-major batch. |
| Frontend lint | `./node_modules/.bin/eslint src/frontend src/index.jsx --ext .js,.jsx` returned zero errors and one unused React-import warning in `ProtectedRoute.js` after the same-major batch. This did not lint every repository file. |
| Frontend audit after the same-major batch | Reported zero known vulnerabilities. This audit preceded the `concurrently` major upgrade; a final audit of that tree remains pending. |
| Backend unit tests | `npm test --prefix src/backend` failed on the retained `emailUtils.test.js`: it uses `node:test`, while the package command uses Vitest and reports `No test suite found`. The authentication test passed. This mismatch was observed before these dependency updates. |
| Combined test command | After installing `concurrently` 10, the sandbox run of `npm run test:all` exited nonzero and reported frontend exit 0 and backend exit 1. Child test output was not fully captured, so this is not a complete runner verification. |
| `concurrently` process checks | Parallel execution, output labels, failure propagation, and interrupt cleanup were attempted with synthetic commands. A direct child-process diagnostic reported sandbox `EPERM`; the smoke assertion did not pass. The outside-sandbox retry was interrupted before a completed result was recorded. These checks remain unverified. |
| Diff whitespace | `git diff --check` passed after the applied dependency batches. |

Audit commands used from the repository root:

```bash
npm audit --package-lock-only --include=dev --json
npm audit --prefix src/backend --package-lock-only --include=dev --json
npm explain yaml
npm ls yaml --all
```

The actual networked audit runs also used temporary cache paths and explicit fetch timeouts. They read the lockfiles without applying fixes. No `npm audit fix --force` or dependency overrides were used. Zero audit findings describe those runs and do not establish complete application security.

### Remaining Work and Related Scope

- Finish the `concurrently` checks outside the sandbox and rerun the final audit before treating the major upgrade as fully validated.
- Rerun backend and combined tests after removing the unrelated Node-runner email suite. Earlier failures above describe the pre-cleanup tree. Broader browser/API workflows and live SMTP delivery remain unverified.
- Verify hosted Dependabot behavior and repository security settings after the configuration is available on the default branch; document any permission or platform limits.
- Complete reviewer ownership, review cadence, severity/exception handling, rollback instructions, and linked verification evidence required by #62. Coordinate policy with #48 and automated dependency/security checks with #50.
- ESLint configuration simplification belongs with #22; running the agreed lint command in CI belongs with #45. The existing 113-rule inline configuration is unchanged.
- Removed three unrelated additions inherited from the pre-rebase commit: `docs/current-deployment-procedures-and-gaps.md`, `docs/dependency-risks.md`, and `src/backend/tests/emailUtils.test.js`. None exists on `main` or belongs to the reviewed Dependabot/dependency-update commit. The historical email-test failures above remain recorded; the suite was removed as scope cleanup rather than migrated to Vitest. Current dependency evidence is consolidated in this existing document.
