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

On October 31, 2026, `npm run test:e2e` passed all 13 tests at revision
`d0088f7` and exited successfully. The runner reported verified cleanup;
the teardown log also recorded a container-stopping error.

Local results and logs are under `test-results/e2e/24827da3ee772172/`,
which is ignored by Git. This was a local run. See the
[CI implementation record](../continuous-integration.md) for hosted evidence.

The related CSV export defect (quoted delimiter, quote, and newline handling) was fixed and documented as BUG-021 in the known-bugs record. The browser journeys do not close all 74 regression-matrix targets. Remaining areas include malformed roster-row outcomes, empty-roster launch, complete reset-prompt behavior, duplicate/concurrent submission and later-entry validation atomicity, inconsistent report source data, and other partial/missing matrix assertions. See the [regression coverage gaps](regression-coverage-gaps.md).

### Extended browser assertions — October 28, 2026

The existing instructor and results journeys were extended for REG-CW02-02, REG-CW05-01, and REG-CW09-01. The instructor now edits course number, section, and semester through the browser and verifies reloaded fields, persisted identity, and owner. After browser launch, captured invitations must expose the existing rubric title/criterion IDs/scales, edited course context, and exact peers from the reorganized teams. Stored evaluator tokens match the invitations; the other owner's course remains uninvited. The results journey now checks each student's rendered numeric mean score against the independent calculation already used for API/CSV checks.

See the [regression coverage gaps](regression-coverage-gaps.md) for
current case mappings and incomplete or missing scenarios.

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
