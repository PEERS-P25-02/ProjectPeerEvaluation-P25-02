# Priority unit/component coverage follow-up

## Strategy and scope

This follow-up targets the user's minimum 70% for priority workflows CW-01 through CW-09. It extends the existing isolated Vitest/React Testing Library suites. It does not equate code execution with verified workflow scenarios, combine frontend/backend percentages, or add integration/E2E execution to unit coverage.

The baseline is main commit `2c26ed13eef42c2b98ed2223fe0526d711182870`. Both measurements use the same production-file inclusion rules. The frontend fix adds one executable line and two branches and removes two callback functions, so those raw denominators change with the production code; no file is excluded to raise coverage. Frontend coverage now explicitly includes all frontend JavaScript/JSX and the entry point, including unimported files, with tests/setup excluded. JSON and JSON-summary reports make the counters inspectable. The frontend baseline was rerun with this explicit denominator; it is not directly comparable to older reports that only included imported modules.

The baseline and expanded suites used Node 24.22.1, Vitest/V8 5.0.5, the thread pool, two frontend workers, one backend worker, and a 20-second local default test timeout. The existing two-teammate submission case now pastes feedback through user-event instead of dispatching every character separately, reducing repeated rendering while retaining all rating/payload/completion assertions. Its explicit timeout is 30 seconds rather than 15 for local headroom. Earlier 5-second course-creation timeouts and 15-/30-second submission timeouts with per-character entry are separate failed runs; the optimized focused student suite passed all seven cases, including the two-teammate case in 7.54 seconds. Thread mode avoids the local fork-worker startup problem; repository defaults and CI worker settings are unchanged.

### Proposed backend business-function mapping

[`scripts/priority-backend-scope.json`](../../../../../scripts/priority-backend-scope.json) names the included production functions and maps modules to the existing workflow IDs. [`scripts/reportPriorityBackendCoverage.cjs`](../../../../../scripts/reportPriorityBackendCoverage.cjs) resolves their actual source ranges from the V8/Istanbul function map. It counts the union of statements, statement-derived lines, functions, and branches in those ranges, including nested callbacks once. It retains raw covered/total counters, source ranges and workflow IDs in `test-results/priority-backend-coverage.json`.

This is a **proposed backend business-logic diagnostic**, not an approved measurement of all code involved in the nine workflows. It omits route wiring, server startup, models, shared configuration and module-initialization code. Authentication account support, standalone reminders, legacy course migration, automatic-assignment placeholders, AI settings, and professor-profile controllers are outside this diagnostic. Reporting includes its mean/curve/grade helpers; invitation composition includes `sendEvaluationInvitation`. Dependencies omitted from this diagnostic remain in the broad application report. Newly discovered controller files or changed export inventories fail mapping until classified. Other new dependency modules still need explicit workflow mapping during review.

The diagnostic fails for missing modules or unmatched function declarations. A missing-ownership-module report was deliberately supplied and rejected with exit 1. This guard supplements the existing backend coverage integrity check; it does not establish scope approval or a numerical gate.

The [quality gate policy](../../../requirements/quality-gate-policy.md) still applies: numerical floors remain inactive pending precise scope review. No CI threshold, branch rule, approved requirement, or workflow scenario expectation is changed. Frontend function-level mapping and complete combined unit/integration/E2E reporting remain follow-up work with Eduardo. Do not describe this change as satisfying the complete 70% workflow requirement.

## Cases and expected outcomes

Cases use synthetic identities and mocked API/model/SMTP boundaries. Existing tests remain in place.

| Source | Workflow | Purpose and expected outcome |
| --- | --- | --- |
| `authenticationSuccess.test.js` | CW-01 | Successful login yields a signed one-hour token and persists last-login time without returning the password hash; registration saves a derived hash; persistence failures do not return a usable token. |
| `courseAuthorization.test.js` | CW-01 | Reject malformed IDs before querying, constrain lookup by both course and professor, attach only owned courses, and forward absent-record/database failures without granting access. |
| `workflowTransitions.test.js` | CW-02–05 | Reactivate inactive courses, retain owner-scoped search, reject protected-field edits, preserve/move/clear team memberships, remove authored and received feedback on student deletion, and constrain reset/roster/team cleanup to the selected course. |
| `reporting.test.js` additions | CW-09 | Check A/B/C/D/F boundaries, normalized participation, multiple received evaluations, curved-score protection/capping, unreviewed students, populated team references, individual/team queries and averages, and failure contracts. |
| `invitationContent.test.js` | CW-07 | Check personalized course/recipient content, matching encoded HashRouter links, default URL/deadline handling, and transport rejection. A mocked transport makes no SMTP connection. |
| `persistenceFailures.test.js` | CW-02–08 | Failed controller queries reach error middleware once with the standardized contract and no successful JSON response. |
| `CourseManagement.test.jsx` additions | CW-03–05, CW-07 | Check health-check failure, invitation rejection/timeout/401/500/502 contracts, team-send retry availability, reset success/failure, refreshed student/team lists, confirmation safeguards, bulk cleanup, and roster search/clear. |

Test names and assertions contain each case's actions and expected results. These files supplement the existing case inventory and regression matrix; they do not redefine matrix outcomes. The repository record contains the affected testing strategy, cases and results. The external shared course Test Document has not been edited by this change.

### Defects detected and fixed

Three new rendered-component regressions failed against the original page:

1. A saved student name did not replace the old name in the visible roster.
2. A deleted student remained in the visible roster.
3. A saved team name did not replace the old name in the visible team list.

Each handler scheduled a state update and immediately filtered the previous render's records. Search handlers now accept the refreshed collection, and mutation handlers pass the returned/updated collection explicitly. The same correction covers CSV roster refresh and team creation/deletion. Existing filters continue to apply. The three original failing regressions and related confirmation/search checks pass after the fix. Tests use independent returned records rather than mutating the original objects, so a stale-reference implementation cannot pass accidentally.

An ownership regression experiment temporarily removed the professor constraint from `requireCourseOwner`; the ownership suite failed with exit 1. The original production code was restored. The component refresh experiments are observed failures, not inferred defects.

## Recorded results — October 28, 2026

| Measurement | Baseline | Expanded |
| --- | ---: | ---: |
| Backend unit tests | 65 passed / 10 files | 129 passed / 15 files |
| Frontend unit/component tests | 63 passed / 8 files | 79 passed / 8 files |
| Backend application statements | 53.37% (845/1583) | 68.16% (1079/1583) |
| Backend application lines | 53.37% (838/1570) | 68.08% (1069/1570) |
| Backend application functions | 70.67% (94/133) | 82.70% (110/133) |
| Backend application branches | 44.44% (320/720) | 67.36% (485/720) |
| Frontend application statements | 58.60% (674/1150) | 70.86% (815/1150) |
| Frontend application lines | 59.79% (656/1097) | 72.40% (795/1098) |
| Frontend application functions | 54.00% (155/287) | 64.56% (184/285) |
| Frontend application branches | 52.90% (455/860) | 61.83% (533/862) |

The proposed backend function-scope diagnostic uses the same ranges for both measurements:

| Metric | Baseline | Expanded |
| --- | ---: | ---: |
| Statements | 61.77% (750/1214) | 80.88% (982/1214) |
| Lines | 61.71% (743/1204) | 80.73% (972/1204) |
| Functions | 81.81% (90/110) | 96.36% (106/110) |
| Branches | 50.00% (285/570) | 78.94% (450/570) |

All four proposed backend diagnostic metrics exceed 70%. This does not activate a gate or establish complete priority-workflow coverage. Frontend application statements and lines now exceed 70%, but frontend branches (61.83%) and functions (64.56%) do not. Frontend function-level mapping and shared models/routes/configuration still require review before treating any scoped percentage as the project's approved minimum.

Validation also includes the backend coverage integrity check, full repository ESLint with zero warnings, the production build, formatting, whitespace checks, and the negative checks described above. The build retains the existing large-bundle warning. The Windows checkout initially used CRLF for tracked JavaScript; normalizing local line endings to LF resolved the full-format check without introducing unrelated Git changes. Hosted CI, integration/E2E reruns, external SMTP delivery and browser-level workflow completion are not asserted.

## Reproduce

Install both lockfiles using a supported Node version (Node 24 recommended):

```sh
npm ci
npm --prefix src/backend ci
```

Standard commands remain independently available:

```sh
npm test
npm --prefix src/backend test
npm run test:coverage
npm --prefix src/backend run test:coverage
node scripts/reportPriorityBackendCoverage.cjs
```

The exact local verification commands, with runtime-specific worker/time allowances, were:

```sh
node node_modules/vitest/vitest.mjs run src/frontend --pool=threads --maxWorkers=2 --testTimeout=20000 --reporter=verbose --coverage
cd src/backend
node node_modules/vitest/vitest.mjs run --config vitest.coverage.config.mjs --pool=threads --maxWorkers=1 --coverage
node scripts/assertCoverage.cjs
cd ../..
node scripts/reportPriorityBackendCoverage.cjs
node node_modules/eslint/bin/eslint.js . --max-warnings=0
node node_modules/vite/bin/vite.js build
```

The diagnostic accepts an optional coverage-final JSON path for comparing a retained report produced from the same production sources. Do not use an older report after production code changes. It does not rerun tests or check artifact age. Missing/stale reports are not passing evidence. Retain full coverage artifacts with run metadata for review; reports and `test-results/` remain ignored.
