# End-to-End Browser Testing

This record documents the isolated Playwright implementation and its local verification. It covers the browser smoke check, repeatable synthetic fixtures, and four instructor/student/report/reset journeys. It does not claim hosted E2E CI, full regression-matrix completion, or external email delivery.

## 1. Testing Strategy

Run the complete stack from the repository root with:

```bash
npm run test:e2e
```

Use Node.js and npm versions specified in the [repository README](../../../../../README.md), Docker with Compose v2, and an available Chromium image build. The runner builds and starts the disposable stack in `compose.e2e.yml`; it does not use the developer `.env`, start a development server, or publish service ports. The browser uses the frontend at `http://frontend`, which calls the backend through the Compose network.

Each invocation receives a random run ID, Compose project, database, and JWT secret. MongoDB and Mailpit are isolated to that stack. Fixture helpers reject unexpected database targets and enforce a collection allowlist and ownership marker before reset. Fixtures contain invented professors, students, courses, teams, invitations, and responses only. Tests run sequentially with one worker; retries are disabled. Independent invocations use separate projects and data.

The suite separates environment/smoke checks, fixture lifecycle checks, and complete browser workflows. Playwright drives actual Chromium pages; tests also inspect real API responses and disposable MongoDB state to verify final persisted outcomes. API setup is used only for prerequisites where appropriate. Invitation URLs are captured from the isolated Mailpit inbox. The regression matrix remains the authority for expected outcomes; the browser suite adds evidence for selected journeys without changing those outcomes.

The runner saves test-runner and service logs, verifies cleanup of run-owned resources, and writes a result summary. A failed build, readiness check, test, or cleanup returns nonzero. SIGINT and SIGTERM initiate cleanup; abrupt host or Docker daemon failure may prevent cleanup.

## 2. Test Cases

| ID | Purpose and steps | Expected result |
| --- | --- | --- |
| E2E-40-01 | Start the isolated stack and open the app in Chromium; verify the browser reaches the intended test backend. | Services become healthy, the app renders, and the smoke interaction succeeds; a failure exits nonzero and cleanup is attempted. |
| E2E-41-01 | Reset and seed the logical baseline twice; inspect records, relations, and indexes. | The same synthetic owners, courses, teams, and students are restored; evaluation/report state is cleared and indexes remain. |
| E2E-41-02 | Log in as the fixture owner and inspect the course list. | The owner sees the owned course; the other owner's course is absent from the list. |
| E2E-42-01 | In the browser, log in as instructor, create and edit supported course information, upload the synthetic roster, reorganize memberships, reload, and launch invitations. Inspect captured invitation contexts and stored eligibility. | Edited course fields persist under the same course ID and owner; displayed roster/team assignments match storage. Invitations resolve to the existing rubric and the launched course's exact team peers, while the other owner's course remains uninvited. |
| E2E-42-02 | Open a captured invitation in a fresh student browser context, submit ratings and feedback, inspect persisted response identities/values, then reopen the completed link and open an invalid link. | The assigned student can submit once; stored responses match submitted values; reopening shows the completed state without creating another submission, and invalid links are rejected. |
| E2E-42-03 | Create varied ratings, review results in the instructor UI, compare each rendered numeric score and API/CSV score to independently calculated expectations, attempt foreign-owner access, and download CSV. | Results and CSV reflect stored data and expected scores; foreign-owner access is denied. |
| E2E-42-04 | Reset the evaluation, verify old response/token state and unrelated course/roster/team preservation, then relaunch and submit through a fresh invitation. | Old invitations no longer permit submission; fresh invitations work; unrelated data remains intact. |

The extended E2E-42-01 and E2E-42-03 assertions target REG-CW02-02, REG-CW05-01, and REG-CW09-01 without adding duplicate journeys.

## 3. Test Results

The implementation was verified locally on the issue #42 worktree based on the then-current main commit `8a563b2dc9408b571e6812c90658b3820a3a72cc`. The full command `npm run test:e2e -- --repeat-each=2` passed 26 tests in each cycle (52 executions total). Four journey cases also passed in focused runs. A preliminary repeated run exposed locator/flow assumptions; those were corrected before the final passing run. Cleanup was verified for the recorded final runs.

The same implementation handoff records passing frontend tests (63), backend tests (65), lint, formatting, frontend build, focused CSV export regression, and whitespace checks. The build emitted the existing large-chunk warning. These are historical results from that implementation work, not reruns for this documentation change. Hosted E2E CI has not been demonstrated.

The related CSV export defect (quoted delimiter, quote, and newline handling) was fixed and documented as BUG-021 in the known-bugs record. The browser journeys do not close all 74 regression-matrix targets. Remaining areas include malformed roster-row outcomes, empty-roster launch, complete reset-prompt behavior, duplicate/concurrent submission and later-entry validation atomicity, inconsistent report source data, and other partial/missing matrix assertions. See the [regression coverage gaps](regression-coverage-gaps.md).

### Extended browser assertions — October 28, 2026

The existing instructor and results journeys were extended for REG-CW02-02, REG-CW05-01, and REG-CW09-01. The instructor now edits course number, section, and semester through the browser and verifies reloaded fields, persisted identity, and owner. After browser launch, captured invitations must expose the existing rubric title/criterion IDs/scales, edited course context, and exact peers from the reorganized teams. Stored evaluator tokens match the invitations; the other owner's course remains uninvited. The results journey now checks each student's rendered numeric mean score against the independent calculation already used for API/CSV checks.

| Command | Actual result | Local evidence |
| --- | --- | --- |
| `npm run test:e2e -- instructor-setup-launch.spec.cjs results-export.spec.cjs` | Passed 2/2; exit 0; cleanup verified. | `test-results/e2e/a5f9762d6883293c/result.json` and runner/service logs. |
| `npm run test:e2e` | Passed 13/13; exit 0; cleanup verified. | `test-results/e2e/fbb1652759a6f104/result.json` and runner/service logs. |
| `npm run lint`, `npm run format:check`, `npm run build` | Passed; build retains the existing bundle-size warning. | Local command output; no hosted E2E claim. |

Each browser command used a fresh guarded Compose/MongoDB/Mailpit stack and synthetic data. Evidence directories are local ignored artifacts. The gap inventory now marks REG-CW02-02 and REG-CW05-01 Present, for 57 Present, 8 Partial, and 9 Missing targets. REG-CW09-01 remains Present with the rendered-score assertion added. These are source classifications, not a coverage percentage or full-matrix completion. Unit and API/database integration suites were not rerun for this browser-only extension. Hosted E2E CI and the shared external Test Document remain unverified/deferred.

## Source Links

- [Playwright configuration](../../../../../playwright.config.cjs)
- [E2E runner and lifecycle](../../../../../scripts/runE2ETests.cjs)
- [Compose E2E environment](../../../../../compose.e2e.yml)
- [Browser smoke test](../../../../../tests/e2e/basic-smoke.spec.cjs)
- [Fixture lifecycle tests](../../../../../tests/e2e/fixtures.spec.cjs)
- [Instructor setup and launch](../../../../../tests/e2e/instructor-setup-launch.spec.cjs)
- [Student invitation and submission](../../../../../tests/e2e/student-invitation-submission.spec.cjs)
- [Results and CSV export](../../../../../tests/e2e/results-export.spec.cjs)
- [Reset and relaunch](../../../../../tests/e2e/reset-relaunch.spec.cjs)
- [Known bugs](../../../known-bugs.md)
