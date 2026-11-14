# End-to-End Browser Testing

## 1. Overview

This record documents 13 Playwright tests in an isolated Chromium environment: two smoke checks, seven fixture and safety checks, and four connected instructor/student journeys. The journeys exercise selected outcomes in the [74-target regression matrix](../../../requirements/regression-test-matrix.md). A browser journey supports only the outcomes it actually observes; it does not establish the full matrix or external email delivery.

The fixture-generated evaluations in TC-E2E-006 and TC-E2E-007 use real application APIs and stored data, but they are not browser submission journeys. TC-E2E-011 and TC-E2E-012 drive student submission through browser pages.

<a id="1-testing-strategy"></a>

## 2. Testing Strategy

Use the Node.js and npm versions in the [repository README](../../../../../README.md), Docker with Compose v2, and the Chromium image build. The [E2E runner](../../../../../scripts/runE2ETests.cjs) builds a disposable stack from [`compose.e2e.yml`](../../../../../compose.e2e.yml): frontend, backend, MongoDB, Mailpit, and the Playwright test container. Playwright's isolated base URL is `http://frontend`; the frontend reaches the backend through the Compose network. No developer `.env` or published service ports are used.

The runner reads the exact stable `@playwright/test` version from the root lockfile and supplies it as a required build argument to the official `mcr.microsoft.com/playwright:v<version>-noble` image. Missing or malformed lockfile versions fail before Docker starts; Compose and Docker also fail visibly if the matching image cannot be resolved. This keeps routine lockfile updates aligned but does not prove browser compatibility. If an upgrade needs a different image variant, test, or environment change, review and document that change with dated verification evidence.

Each invocation owns a random run ID, Compose project, database, and JWT secret. Fixtures use synthetic professors, students, courses, teams, messages, and evaluations. Helpers reject unsafe URLs and database targets, require an ownership marker, and allow only known collections before reset. Mailpit captures invitation links without forwarding to real recipients. The [Playwright configuration](../../../../../playwright.config.cjs) runs one worker, no retries, and sequential tests.

Playwright drives Chromium for the selected UI steps. Tests also inspect API responses and the run-owned MongoDB database where the expected result includes persisted state. The runner keeps logs and browser artifacts, writes `result.json`, and checks cleanup of its own containers, networks, and volumes. Startup, test, or cleanup failure returns nonzero; interruption initiates cleanup.

## 3. Test Organization

| Spec file | Responsibility | New cases |
| --- | --- | --- |
| [`smoke.spec.cjs`](../../../../../tests/e2e/smoke.spec.cjs) | Same-origin frontend/backend smoke and invalid-login request routing. | TC-E2E-001–002 |
| [`fixtures.spec.cjs`](../../../../../tests/e2e/fixtures.spec.cjs) | Repeatable seed, owner login, captured-link form, fixture submission builder, target guards, and controlled-failure cleanup. | TC-E2E-003–009 |
| [`instructor-setup-launch.spec.cjs`](../../../../../tests/e2e/instructor-setup-launch.spec.cjs) | Browser course, roster, team, and evaluation-launch journey. | TC-E2E-010 |
| [`student-invitation-submission.spec.cjs`](../../../../../tests/e2e/student-invitation-submission.spec.cjs) | Captured invitation, browser submission, completed link, and invalid link. | TC-E2E-011 |
| [`results-export.spec.cjs`](../../../../../tests/e2e/results-export.spec.cjs) | Browser score review and CSV download with independent score checks. | TC-E2E-012 |
| [`reset-relaunch.spec.cjs`](../../../../../tests/e2e/reset-relaunch.spec.cjs) | Browser reset, old-link invalidation, relaunch, and fresh submission. | TC-E2E-013 |

[`playwright.config.cjs`](../../../../../playwright.config.cjs) owns browser options and the test base URL; [`runE2ETests.cjs`](../../../../../scripts/runE2ETests.cjs) owns stack lifecycle and artifacts; [`compose.e2e.yml`](../../../../../compose.e2e.yml) defines the isolated services.

<a id="2-test-cases"></a>
<a id="test-cases"></a>

## 4. Test Cases

Each row names one executable Playwright test; TC-E2E-006 and TC-E2E-007 are the two parameterized instances of the fixture submission builder. Regression targets appear only where the cited assertions observe the target behavior. A dash marks a smoke or fixture-safety case without a direct matrix target.

| Test Case | Objective | Steps | Expected Result | Regression Target | Source |
| --- | --- | --- | --- | --- | --- |
| TC-E2E-001 | Verify frontend rendering and backend health | Request `/api/health` and open the app in Chromium. | Same-origin health returns HTTP 200/`OK`; the login page, email field, and password field render at `http://frontend`. | — | [`smoke.spec.cjs`](../../../../../tests/e2e/smoke.spec.cjs) |
| TC-E2E-002 | Verify login reaches the isolated backend | Submit synthetic invalid credentials through the browser login form and inspect the request/response. | A same-origin POST reaches `/api/auth/login`, returns HTTP 401 `AUTH_ERROR`, and leaves the login page visible. | — | [`smoke.spec.cjs`](../../../../../tests/e2e/smoke.spec.cjs) |
| TC-E2E-003 | Verify repeatable fixture reset and indexes | Invite, add a report sentinel, then reset and seed the baseline twice; inspect records, inbox, and indexes. | The same logical owners, courses, teams, and students return; evaluation/report data and inbox clear; professor/student indexes remain. | — | [`fixtures.spec.cjs`](../../../../../tests/e2e/fixtures.spec.cjs) |
| TC-E2E-004 | Verify professor login and course visibility | Log in as the fixture owner in Chromium and compare visible courses with the other owner's API list. | The owner sees the owned course and not the other owner's course. | REG-CW01-01 | [`fixtures.spec.cjs`](../../../../../tests/e2e/fixtures.spec.cjs) |
| TC-E2E-005 | Verify captured invitation opens the correct form | Invite the fixture course; open a captured student URL in Chromium and inspect the rubric and teammate headings. | The assigned student's form opens with the intended same-team peer; other team and course students are absent. | REG-CW06-01 | [`fixtures.spec.cjs`](../../../../../tests/e2e/fixtures.spec.cjs) |
| TC-E2E-006 | Verify one fixture-generated completion | Use the fixture submission builder for one evaluation; inspect status, stored ratings, and foreign-course status. | One real response is stored for a nonself recipient; completed/pending totals are 1/3; the other course remains unlaunched. This is API/fixture work, not a browser submission. | — | [`fixtures.spec.cjs`](../../../../../tests/e2e/fixtures.spec.cjs) |
| TC-E2E-007 | Verify four fixture-generated completions | Use the same builder for four evaluations; inspect status, stored ratings, and foreign-course status. | Four real responses are stored for nonself recipients; completed/pending totals are 4/0; the other course remains unlaunched. This is API/fixture work, not a browser submission. | — | [`fixtures.spec.cjs`](../../../../../tests/e2e/fixtures.spec.cjs) |
| TC-E2E-008 | Verify environment and database safety guards | Try unsafe run IDs, URLs, environment values, database ownership, and unknown collections; compare sentinels and inbox. | Guarded reset/open operations reject unsafe targets without deleting sentinel records or captured mail. | — | [`fixtures.spec.cjs`](../../../../../tests/e2e/fixtures.spec.cjs) |
| TC-E2E-009 | Verify fixture cleanup after controlled failures | Cause synthetic fixture-preparation and test-work errors inside the fixture wrapper, then inspect owned collections and Mailpit. | Both errors propagate; fixture cleanup empties known collections and inbox while retaining the valid database ownership marker. This does not assert a full runner failure exit. | — | [`fixtures.spec.cjs`](../../../../../tests/e2e/fixtures.spec.cjs) |
| TC-E2E-010 | Verify instructor setup and launch | In Chromium, log in, create/edit a course, upload CSV, reorganize teams, reload, and launch; compare UI, API, MongoDB, and captured invitation contexts. | Course ID/owner and edited fields persist; roster and team memberships match; four invitations resolve to the existing rubric, edited course, and exact eligible peers; the other owner's course remains uninvited. | REG-CW02-01, REG-CW02-02, REG-CW03-01, REG-CW04-01, REG-CW05-01, REG-CW05-03 | [`instructor-setup-launch.spec.cjs`](../../../../../tests/e2e/instructor-setup-launch.spec.cjs) |
| TC-E2E-011 | Verify student invitation and submission | Launch and capture a link; submit ratings/feedback in a fresh student browser context; reopen the completed link and open an invalid link. | One response stores the assigned evaluator, peer, ratings, and feedback; the reopened link shows completion without another write; the invalid link shows an error. | REG-CW06-01, REG-CW08-01, REG-CW08-05 | [`student-invitation-submission.spec.cjs`](../../../../../tests/e2e/student-invitation-submission.spec.cjs) |
| TC-E2E-012 | Verify scores and CSV export | Submit varied evaluations through student browser pages; review numeric scores and download CSV in the instructor browser; compare with independent calculations and stored/API data. | Each rendered and exported score matches the calculation; the downloaded CSV keeps a comma-and-quote student name in one field; foreign-owner report access is denied. | REG-CW09-01, REG-CW09-02, REG-CW09-07 | [`results-export.spec.cjs`](../../../../../tests/e2e/results-export.spec.cjs) |
| TC-E2E-013 | Verify reset and relaunch | Complete a response, reset through the instructor UI, inspect state and old link, relaunch, and submit with a new invitation. | Old responses/tokens clear and the old link fails; roster, teams, and the other course remain; a distinct fresh token permits a new stored response. | REG-CW05-04, REG-CW05-05 | [`reset-relaunch.spec.cjs`](../../../../../tests/e2e/reset-relaunch.spec.cjs) |

TC-E2E-011 observes the completed-link browser state and unchanged response count. It does not send a second submission; [TC-INT-040](api-database-integration.md#test-cases) checks the REG-CW08-05 repeat POST and non-overwrite outcome. TC-E2E-012 adds browser-download evidence to the independent REG-CW09-02 API/database case.

The seven maintained legacy IDs remain mapped here for the coordinated RTM update. The old smoke case grouped both current smoke checks; TC-E2E-005 through TC-E2E-009 make additional fixture checks explicit.

| Legacy ID | New case ID(s) |
| --- | --- |
| E2E-40-01 | TC-E2E-001, TC-E2E-002 |
| E2E-41-01 | TC-E2E-003 |
| E2E-41-02 | TC-E2E-004 |
| E2E-42-01 | TC-E2E-010 |
| E2E-42-02 | TC-E2E-011 |
| E2E-42-03 | TC-E2E-012 |
| E2E-42-04 | TC-E2E-013 |

## 5. Execution Instructions

Run from the repository root with Docker and Compose available. Each command creates and cleans up its own isolated stack:

```bash
npm run test:e2e
npm run test:e2e -- tests/e2e/smoke.spec.cjs
npm run test:e2e -- tests/e2e/instructor-setup-launch.spec.cjs
```

The first command runs all 13 tests. The latter two show focused spec-file selection; substitute any of the six spec paths above to run that file's tests. Review runner output and ignored `test-results/e2e/<run-id>/result.json` for completion and cleanup. A focused pass does not establish a full-suite pass.

<a id="3-test-results"></a>
<a id="verification-results"></a>

## 6. Test Results

The historical October 31, 2026 `npm run test:e2e` at revision `d0088f7` passed 13 tests, exited successfully, and reported verified cleanup. Its teardown log also recorded a container-stopping error, so the run should not be described as error-free. The original [result at commit `dd7d26d`](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/blob/dd7d26d1aa3b4431b6cd477271e19ca8f792435f/docs/Team-P25-02/modernization/implementation/testing/end-to-end-testing.md#3-test-results) preserves both facts. Local logs under `test-results/e2e/24827da3ee772172/` are ignored by Git.

This is dated local evidence for that revision, not a new execution of this documentation change. Hosted E2E results are documented separately in the [CI implementation record](../continuous-integration.md); a local pass alone does not establish required-check enforcement.

## 7. Limitations and Remaining Coverage

- The four selected journeys do not exercise every [regression-matrix](../../../requirements/regression-test-matrix.md) target. Browser-level gaps include malformed roster-row outcomes, empty-roster launch, full reset-prompt behavior, duplicate/concurrent submissions and later-entry validation, and inconsistent report source data. Some have API/database or component assertions, but those do not establish the same browser journey.
- [BUG-021](../../../known-bugs.md) is fixed in source. The CSV browser test covers a student name containing a comma and a quote; newline-containing values remain untested by that journey.
- Mailpit captures invitation messages; the suite does not establish external provider delivery or that a recipient opened an email.
- The October 31 result is local verification. Consult the [CI implementation record](../continuous-integration.md) for hosted execution; this document does not claim every E2E case is required by CI on every change.
