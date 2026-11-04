# End-to-End Browser Testing

## Purpose and Scope

This record documents the isolated Playwright implementation and its local verification. It covers the browser smoke check, repeatable synthetic fixtures, and four instructor/student/report/reset journeys. The browser suite adds evidence for selected journeys without changing expected outcomes in the [regression matrix](../../../requirements/regression-test-matrix.md). It does not claim full regression-matrix completion or external email delivery.

<a id="1-testing-strategy"></a>
## Testing Environment and Tools

Use Node.js and npm versions specified in the [repository README](../../../../../README.md), Docker with Compose v2, and an available Chromium image build. The runner builds and starts the disposable stack in [`compose.e2e.yml`](../../../../../compose.e2e.yml); it does not use the developer `.env`, start a development server, or publish service ports. The browser uses the frontend at `http://frontend`, which calls the backend through the Compose network.

Each invocation receives a random run ID, Compose project, database, and JWT secret. MongoDB and Mailpit are isolated to that stack. Fixture helpers reject unexpected database targets and enforce a collection allowlist and ownership marker before reset. Fixtures contain invented professors, students, courses, teams, invitations, and responses only. Tests run sequentially with one worker; retries are disabled. Independent invocations use separate projects and data.

The suite separates environment/smoke checks, fixture lifecycle checks, and complete browser workflows. Playwright drives actual Chromium pages; tests also inspect real API responses and disposable MongoDB state to verify final persisted outcomes. API setup is used only for prerequisites where appropriate. Invitation URLs are captured from the isolated Mailpit inbox. The runner saves test-runner and service logs, verifies cleanup of run-owned resources, and writes a result summary. A failed build, readiness check, test, or cleanup returns nonzero. SIGINT and SIGTERM initiate cleanup; abrupt host or Docker daemon failure may prevent cleanup.

## Test Organization

The Playwright suite and its supporting files are:

- [Playwright configuration](../../../../../playwright.config.cjs)
- [E2E runner and lifecycle](../../../../../scripts/runE2ETests.cjs)
- [Compose E2E environment](../../../../../compose.e2e.yml)
- [Browser smoke test](../../../../../tests/e2e/smoke.spec.cjs)
- [Fixture lifecycle tests](../../../../../tests/e2e/fixtures.spec.cjs)
- [Instructor setup and launch](../../../../../tests/e2e/instructor-setup-launch.spec.cjs)
- [Student invitation and submission](../../../../../tests/e2e/student-invitation-submission.spec.cjs)
- [Results and CSV export](../../../../../tests/e2e/results-export.spec.cjs)
- [Reset and relaunch](../../../../../tests/e2e/reset-relaunch.spec.cjs)

The six spec files cover smoke, fixture lifecycle, and four selected user journeys. The regression matrix remains the authority for expected outcomes; individual browser journeys do not substitute for linked matrix outcomes unless they observe those outcomes.

<a id="2-test-cases"></a>
## Test Cases

| ID | Purpose and steps | Expected result |
| --- | --- | --- |
| E2E-40-01 | Start the isolated stack and open the app in Chromium; verify the browser reaches the intended test backend. | Services become healthy, the app renders, and the smoke interaction succeeds; a failure exits nonzero and cleanup is attempted. |
| E2E-41-01 | Reset and seed the logical baseline twice; inspect records, relations, and indexes. | The same synthetic owners, courses, teams, and students are restored; evaluation/report state is cleared and indexes remain. |
| E2E-41-02 | Log in as the fixture owner and inspect the course list. | The owner sees the owned course; the other owner's course is absent from the list. |
| E2E-42-01 | In the browser, log in as instructor, create and edit supported course information, upload the synthetic roster, reorganize memberships, reload, and launch invitations. Inspect captured invitation contexts and stored eligibility. | Edited course fields persist under the same course ID and owner; displayed roster/team assignments match storage. Invitations resolve to the existing rubric and the launched course's exact team peers, while the other owner's course remains uninvited. |
| E2E-42-02 | Open a captured invitation in a fresh student browser context, submit ratings and feedback, inspect persisted response identities/values, then reopen the completed link and open an invalid link. | The assigned student can submit once; stored responses match submitted values; reopening shows the completed state without creating another submission, and invalid links are rejected. |
| E2E-42-03 | Create varied ratings, review results in the instructor UI, compare each rendered numeric score and API/CSV score to independently calculated expectations, attempt foreign-owner access, and download CSV. | Results and CSV reflect stored data and expected scores; foreign-owner access is denied. |
| E2E-42-04 | Reset the evaluation, verify old response/token state and unrelated course/roster/team preservation, then relaunch and submit through a fresh invitation. | Old invitations no longer permit submission; fresh invitations work; unrelated data remains intact. |

The instructor and results journeys also cover these regression-matrix concerns:

- **REG-CW02-02:** The instructor edits course number, section, and semester through the browser; reloaded fields persist with the same course ID and owner.
- **REG-CW05-01:** Captured invitations resolve to the existing rubric title, criterion IDs and scales, edited course context, intended evaluators, and exact peers from reorganized teams. Stored evaluator tokens match invitations, and the other owner's course remains uninvited.
- **REG-CW09-01:** Each student's rendered numeric mean score matches the independent calculation also used for API/CSV checks.

These extended assertions were added October 28, 2026, without adding duplicate journeys.

## Execution Instructions

From the repository root, run the isolated browser suite:

```bash
npm run test:e2e
```

<a id="3-test-results"></a>
## Verification Results

The latest documented local run was October 31, 2026, at revision `d0088f7`:

| Command | Result |
| --- | --- |
| `npm run test:e2e` | 13 tests passed; runner exited successfully and reported verified cleanup. |

The teardown log also recorded a container-stopping error; the successful result does not mean the log was error-free. This is a previously recorded result, not a rerun for this documentation update. The record at [revision `dd7d26d`](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/blob/dd7d26d1aa3b4431b6cd477271e19ca8f792435f/docs/Team-P25-02/modernization/implementation/testing/end-to-end-testing.md#3-test-results) preserves this report. Local results and logs are under `test-results/e2e/24827da3ee772172/`, which is ignored by Git. For hosted execution evidence, see the [CI implementation record](../continuous-integration.md).

## Limitations and Remaining Work

The selected browser journeys do not complete all 74 regression-matrix targets. Remaining browser-layer assertions include malformed roster-row outcomes, empty-roster launch, complete reset-prompt behavior, duplicate/concurrent submission and later-entry validation atomicity, and inconsistent report source data. Some behaviors have API/database or mocked component assertions, but those assertions do not establish the same cross-layer browser journey. See the [regression coverage gaps](regression-coverage-gaps.md) for target mappings and remaining cross-layer gaps.

Hosted E2E execution is documented separately in the [CI implementation record](../continuous-integration.md); the October 31 local run does not itself establish hosted execution or required-check enforcement. External email delivery is not tested; invitations are captured by isolated Mailpit.

The related CSV export defect involving quoted delimiters, quotes, and newlines was fixed and documented as [BUG-021](../../../known-bugs.md). The browser journey verifies quoted-delimiter and quote handling; newline-containing values remain untested.
