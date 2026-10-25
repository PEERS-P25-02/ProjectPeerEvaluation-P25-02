# ESLint Upgrade and Flat Configuration

**Updated:** October 19, 2026
**Status:** Implemented with an accepted ESLint 9 support exception; lint has zero errors and zero warnings.

## Goal and implementation plan

This change upgrades ESLint and introduces a standalone flat configuration, with explicit review of changes to the inherited checks.

Implemented on 2026-10-19:

1. Capture ESLint 8's 113 effective rules and diagnostics before changing dependencies; check current releases, Node engines, and plugin peer ranges.
2. Establish an equivalent flat configuration, then review recommended presets against the application's code and adopt the approved policy changes below.
3. Add lint and formatting commands, clean up frontend lint findings and debug logging, and verify resolution, lint behavior, formatting, build, and the existing tests.

The final implementation uses ESLint 9.39.5 with the accepted support
limitation below, recommended presets with project overrides, and a shared
Prettier baseline. It includes frontend debug-log cleanup, the reminder-query
and UUID fixes, and removal of all nine lint warnings. Tests share the
formatter baseline and receive Vitest-specific lint checks; existing cases
and assertions remain unchanged.

## Version selection and support limitation

| Package | Selected version | Compatibility and purpose |
| --- | --- | --- |
| ESLint and `@eslint/js` | 9.39.5 | Node `^18.18.0 || ^20.9.0 || >=21.1.0`; compatible with the project's stricter Node range. Core recommended preset is a direct dependency. |
| `eslint-plugin-react` | 7.37.5, unchanged | Peer range ends at `^9.7`; provides recommended and JSX-runtime presets. |
| `eslint-plugin-react-hooks` | 5.2.0, unchanged | Supports ESLint 9; its recommended preset supplies the two existing Hooks checks. |
| `eslint-plugin-import` | 2.32.0, unchanged | Supports ESLint 9, excludes 10; checks imports and exports. |
| `eslint-plugin-jsx-a11y` | 6.10.2, unchanged | Supports ESLint 9, excludes 10; supplies accessibility recommended rules. |
| `globals` | 17.13.0 | Browser and Node global definitions, Node >=18. |
| `eslint-import-resolver-typescript` | 4.4.5 | Resolves JavaScript/JSX paths and package imports/exports. No TypeScript application conversion or extra parser is required. |
| `eslint-config-prettier` | 10.1.8 | Disables formatting rules after all lint presets. Existing Prettier performs formatting separately. |
| `@vitest/eslint-plugin` | 1.6.27 | Supports ESLint >=8.57 and Node >=18; supplies recommended checks for automated test/spec files. TypeScript utilities/compiler are transitive tooling dependencies; Espree remains the application parser. |

ESLint 10.13.0 was the current npm release, but the latest published React,
import, and accessibility plugins did not declare ESLint 10 compatibility.
Hooks 7.1.1 did declare it, which does not resolve the other constraints.
Hooks 5.2.0 retains the matching existing preset without introducing newer
compiler checks.

[ESLint's support policy](https://eslint.org/version-support/) records ESLint
9's end of life as 2026-08-06. The selected version is an approved interim
migration, not a supported toolchain. The supported-release goal
remains unmet. No forced peer resolution or dependency overrides are used.
Revisit ESLint 10 when all three plugins publish compatible releases; see the
[React compatibility issue](https://github.com/jsx-eslint/eslint-plugin-react/issues/3984).

## Commands and coverage

```bash
npm run lint
npm run format:check
npm run format
npm run build
npm test
npm --prefix src/backend test
```

`eslint.config.mjs` replaces `package.json#eslintConfig` without changing the
packages' module settings. Espree remains the parser. The unused direct
`@eslint/eslintrc` dependency is removed; ESLint still uses it internally.
The backend manifest and lockfile are unchanged.

Configuration artifacts: [ESLint](../../../../../eslint.config.mjs),
[Prettier options](../../../../../prettier.config.cjs),
[Prettier exclusions](../../../../../.prettierignore), and
[root scripts/dependencies](../../../../../package.json). Install both packages through
`npm run setup` before using the shared root tooling; the backend package does
not install a second copy of ESLint or Prettier.

- Lint covers `.js`, `.jsx`, `.mjs`, and `.cjs` across application code, maintenance scripts, migrations, tests, and tooling configuration: 66 files in this revision.
- Generated `node_modules`, `build`, `dist`, and `coverage` directories at any depth, plus hidden files/directories, are excluded. HTML, CSS, JSON, and Markdown are outside these commands' scope.
- Frontend files use browser globals and frontend presets. Other files use Node globals. Backend `.js` files use CommonJS except tests, which retain their ES module imports; `.cjs` uses CommonJS by default.
- The import resolver handles JSX paths and package exports, with browser conditions for the frontend and Node conditions elsewhere. `import/no-unresolved` also checks CommonJS `require` calls. Resolution success does not guarantee that a runtime API exists in every target environment.
- Prettier checks application code, automated tests, setup helpers, manual API scripts, and tooling JavaScript/JSX using two spaces and single quotes. Its generated/hidden exclusions match lint's; there are no test exclusions.
- The Vitest recommended preset applies only to `src/**/*.{test,spec}.{js,jsx,mjs,cjs}`. Helpers remain explicitly imported from Vitest, with no added global test names. Setup helpers, manual scripts, and application files retain ordinary lint rules without the Vitest preset.
- Lint returns 0 with warnings, 1 for lint errors, and 2 for configuration/execution failures. The formatting check returns nonzero for formatting differences and does not edit files; `npm run format` applies formatting.

To check only the backend, run these from the repository root:

```bash
npx eslint src/backend
npx prettier --check "src/backend/**/*.{js,mjs,cjs}"
```

## Rule and preset comparison

The initial flat migration matched all 113 inherited rules and all diagnostics
on the 64 pre-existing files: zero errors and eight warnings. The following
policy changes were subsequently reviewed and approved; final diagnostics
are intentionally different.

| Preset | Additional rule names versus legacy | Different overlapping entries | Final decision |
| --- | ---: | ---: | --- |
| `@eslint/js` recommended | 27 | 33 | Adopt core correctness rules at recommended severity; keep unused variables as warnings. |
| React recommended | 12 | 8 | Adopt for frontend, add JSX-runtime preset, disable PropTypes checking. |
| Hooks recommended | 0 | 0 | Keep Rules of Hooks as errors and exhaustive dependencies as warnings. |
| import recommended | 8 | 0 | Adopt with a compatible resolver; disable `no-named-as-default-member`. |
| accessibility recommended | 17 | 17 | Adopt for frontend; keep autofocus as a warning for contextual review. |

Counts compare the installed presets' explicit entries, including options and
normalized severities. A different entry is often a promotion from warning to
error, rather than a new rule. Prettier's final disabling configuration and
explicit exceptions affect the final active rule count.

The frontend application config has 163 active rules: 58 added names, eight retired
names, and 56 inherited rules promoted from warning to error. Backend files
have 107 active rules; frontend-specific checks no longer apply there.
Automated test/spec files receive 17 additional Vitest rules: 180 active
rules for frontend tests and 124 for backend tests. The four key severities
below are explicit even where they match the plugin's recommended preset.
Useful inherited checks absent from the presets, including `no-eval`, remain.

Intentional overrides and replacements:

| Change | Reason |
| --- | --- |
| Core correctness rules, notably `no-dupe-keys`, become errors. | Logic defects should fail lint. The duplicate reminder-query key is now fixed. |
| `no-unused-vars` remains a warning with `args: 'none'`, `ignoreRestSiblings: true`, and `caughtErrors: 'none'`. | Retains the reviewed parameter policy; stricter unused-parameter cleanup is deferred. |
| `no-useless-computed-key` uses its current default. | Removes the temporary ESLint 8 compatibility override and checks computed class member names. |
| `react/jsx-uses-react` and `react/react-in-jsx-scope` are disabled by JSX-runtime. | JSX does not require a default React import; `react/jsx-uses-vars` remains enabled. |
| `react/prop-types` is disabled. | React 19 removed runtime PropTypes checking. No PropTypes dependency is introduced. |
| `jsx-a11y/no-autofocus` is a warning. | The three dialog fields no longer force initial focus. MUI manages focus within the dialog and restores it to the opener; the rule remains enabled. |
| `import/no-named-as-default-member` is disabled. | Avoids flagging legitimate APIs such as `axios.create()`. |
| `no-new-object` becomes `no-object-constructor`. | Uses the maintained replacement, which also checks unnecessary `Object()` calls. |
| `no-new-symbol` becomes recommended `no-new-native-nonconstructor`. | Uses the maintained check for constructing Symbol/BigInt. |
| `dot-location`, `new-parens`, `no-mixed-operators`, `no-whitespace-before-property`, and `rest-spread-spacing` are retired. | Formatting moves to Prettier. The final `eslint-config-prettier` config disables conflicting checks, including newly recommended `no-unexpected-multiline`. |
| Unused-disable reporting is a warning. | Detects stale suppressions; the existing unused blanket directive was removed. |
| Frontend `no-console` warns except for `warn` and `error`. | Prevents debug-log accumulation while retaining error reporting. Backend logging remains allowed. |
| `vitest/no-focused-tests`, `vitest/valid-expect`, and `vitest/no-identical-title` are errors. | Prevent committed focused tests, malformed assertions, and duplicate test names. Applies only to automated test/spec files. |
| `vitest/no-disabled-tests` is a warning. | Makes skipped tests visible without failing lint solely because a test is skipped. |

For upstream context, see the [ESLint 9 migration guide](https://eslint.org/docs/latest/use/migrate-to-9.0.0),
[React 19 PropTypes removal](https://react.dev/blog/2024/04/25/react-19-upgrade-guide#removed-proptypes-and-defaultprops),
[resolver documentation](https://github.com/import-js/eslint-import-resolver-typescript),
and [Prettier lint integration](https://prettier.io/docs/integrating-with-linters).

## Source cleanup and formatting

Frontend cleanup removes unnecessary default React imports, escapes the four
JSX quotation marks without changing rendered text, removes the stale lint
suppression, and removes 46 debug console calls, including token-preview
logging. API calls formerly assigned only for logging remain awaited, and
connectivity response parsing remains in place. Warnings/errors remain logged.

The Prettier baseline formats existing application/tooling files, so the diff
is substantially larger than the lint policy change alone. The existing
frontend test and manual API script are formatted; the backend test and
frontend setup already matched Prettier. A syntax-tree comparison confirms
that all four retain their existing behavior and assertions. Backend changes
comprise formatting, unused-declaration cleanup,
and two targeted fixes. In the reminder query, `$in: student_ids` and
`$nin: completedEvaluations` now share one `_id` field, so the query both
respects the selection and excludes completed evaluations. The sample-data
script replaces the missing `uuid` dependency with `randomUUID` from
`node:crypto`, preserving the version-4 UUID token format without adding a
package. The database-mutating script was not executed during verification.

The warning cleanup removes unused invitation/reminder imports from the authentication
controller, two unused `custom_message` destructuring entries, redundant
Multer initialization in the student controller, and the unused Mongoose
import in the migration. The course route retains the active roster-upload
middleware. It also removes `autoFocus` from the Create Team, Create Course, and Edit
Course fields; MUI retains focus management at the dialog level. Lint rule
severities and suppressions were not changed.

## Verification and resolved findings

Verified with Node 24.21.0 and npm 11.19.0:

| Check | Result |
| --- | --- |
| Dependency installation and targeted `npm ls` | Passed; no invalid peer dependencies. ESLint 9's deprecation remains expected. |
| JSX and ESM package resolution | Valid JSX imports, Vite, and the React Vite plugin resolve without suppressions. UUID generation now uses a built-in Node module. |
| `npm run lint` | Passed, exit 0: zero errors and zero warnings across frontend, backend, tests, and configuration. |
| Backend coverage | Shared lint and formatting commands include backend files. Backend-only commands are `npx eslint src/backend` and `npx prettier --check "src/backend/**/*.{js,mjs,cjs}"`, run from the repository root. |
| UUID verification | The built-in import resolves, source uses `randomUUID()`, and 20 generated values match the version-4 UUID format. No database script execution or new test cases. |
| Reminder-query verification | Three in-memory recipient cases pass: selected pending students, all pending students without a selection, and no recipients for a completed-only selection. Database and SMTP dependencies were stubbed; no permanent test cases were added. |
| Vitest lint verification | In-memory fixtures confirm focused tests, invalid assertions, and duplicate titles are errors; skipped tests warn. Verified frontend/backend test files and a backend spec outside the tests directory. Helpers, manual scripts, and application code do not receive Vitest rules. |
| Test-format verification | Syntax trees before/after formatting match for the frontend test, backend test, setup helper, and manual API script. Existing cases and assertions are preserved. |
| `npm run format:check` | Passed across application code, tests, setup helpers, manual scripts, and tooling. |
| Dialog focus verification | In-memory jsdom/MUI check confirms focus enters the dialog without field autofocus and returns to the opener on close. No permanent test cases were added. |
| `npm run build` | Passed; JavaScript bundle 651.02 kB, with the existing >500 kB warning. |
| `npm test` | Existing frontend suite passes: one test. |
| `npm --prefix src/backend test` | Existing backend suite passes: one test. No new test cases added. |

Resolved lint warnings:

| File | Previous finding | Resolution |
| --- | --- | --- |
| `src/backend/controllers/authController.js` | Two unused invitation/reminder imports. | Removed unused imports; retained password-reset email helper. |
| `src/backend/controllers/evaluationController.js` | Two unused `custom_message` variables. | Removed unused destructuring entries. |
| `src/backend/controllers/studentController.js` | Unused `upload`. | Removed redundant Multer import/initialization; route middleware remains. |
| `src/backend/migrations/migrateCourses.js` | Unused `mongoose`. | Removed unused import. |
| `src/frontend/pages/CourseManagement.jsx` | Three field autofocus warnings. | Removed field-level autofocus; retained MUI dialog focus management. |

The support exception remains unresolved. The current [CI workflow](../../../../../.github/workflows/ci.yml) defines five jobs: frontend build, combined lint and formatting, combined frontend/backend unit tests and coverage, OWASP Dependency-Check, and Gitleaks. It does not run the local integration suite; required-check settings are configured separately from the workflow. The production build's bundle-size warning remains separate from the clean ESLint report.

Static accessibility checks and the in-memory focus check do not replace rendered
MUI/browser keyboard checks. Other Node versions, editor integrations,
dependency audits, and live MongoDB/SMTP workflows were not verified.
