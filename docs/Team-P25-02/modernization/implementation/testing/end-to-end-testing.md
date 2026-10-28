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
| E2E-42-01 | In the browser, log in as instructor, create a course, upload the synthetic roster, reorganize memberships, reload, and launch invitations. | The displayed and persisted course, roster, team assignments, and launch state match the actions. |
| E2E-42-02 | Open a captured invitation in a fresh student browser context, submit ratings and feedback, inspect persisted response identities/values, then reopen the completed link and open an invalid link. | The assigned student can submit once; stored responses match submitted values; reopening shows the completed state without creating another submission, and invalid links are rejected. |
| E2E-42-03 | Create varied ratings, review results in the instructor UI, compare reported scores to independently calculated expectations, attempt foreign-owner access, and download CSV. | Results and CSV reflect stored data and expected scores; foreign-owner access is denied. |
| E2E-42-04 | Reset the evaluation, verify old response/token state and unrelated course/roster/team preservation, then relaunch and submit through a fresh invitation. | Old invitations no longer permit submission; fresh invitations work; unrelated data remains intact. |

## 3. Test Results

The implementation was verified locally on the issue #42 worktree based on the then-current main commit `8a563b2dc9408b571e6812c90658b3820a3a72cc`. The full command `npm run test:e2e -- --repeat-each=2` passed 26 tests in each cycle (52 executions total). Four journey cases also passed in focused runs. A preliminary repeated run exposed locator/flow assumptions; those were corrected before the final passing run. Cleanup was verified for the recorded final runs.

The same implementation handoff records passing frontend tests (63), backend tests (65), lint, formatting, frontend build, focused CSV export regression, and whitespace checks. The build emitted the existing large-chunk warning. These are historical results from that implementation work, not reruns for this documentation change. Hosted E2E CI has not been demonstrated.

The related CSV export defect (quoted delimiter, quote, and newline handling) was fixed and documented as BUG-021 in the known-bugs record. The browser journeys do not close all 74 regression-matrix targets. Remaining areas include malformed roster-row outcomes, empty-roster launch, complete reset-prompt behavior, duplicate/concurrent submission and later-entry validation atomicity, inconsistent report source data, and other partial/missing matrix assertions. See the [regression coverage gaps](regression-coverage-gaps.md).

## Source Links

- [Playwright configuration](../../../../../playwright.config.cjs)
- [E2E runner and lifecycle](../../../../../scripts/runE2ETests.cjs)
- [Compose E2E environment](../../../../../compose.e2e.yml)
- [Browser smoke test](../../../../../tests/e2e/smoke.spec.cjs)
- [Fixture lifecycle tests](../../../../../tests/e2e/fixtures.spec.cjs)
- [Instructor setup and launch](../../../../../tests/e2e/instructor-setup-launch.spec.cjs)
- [Student invitation and submission](../../../../../tests/e2e/student-invitation-submission.spec.cjs)
- [Results and CSV export](../../../../../tests/e2e/results-export.spec.cjs)
- [Reset and relaunch](../../../../../tests/e2e/reset-relaunch.spec.cjs)
- [Known bugs](../../../known-bugs.md)
