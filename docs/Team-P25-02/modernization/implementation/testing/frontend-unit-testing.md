# Frontend Unit Testing

## 1. Overview

This record describes frontend unit and component test organization, cases,
execution, the latest dated result, and known coverage limits. Tests use Vitest,
jsdom, and React Testing Library with synthetic data and mocked API boundaries.
They do not establish backend behavior, database persistence, email delivery,
or full browser end-to-end behavior.

## 2. Testing Strategy

Tests exercise components and frontend services at their unit/component
boundaries. API responses and browser storage are controlled in tests; routing
uses `MemoryRouter` where needed. This keeps the suite independent of MongoDB,
SMTP, and running application services. The suite uses
`@testing-library/user-event` for interactions and
`@testing-library/jest-dom` for DOM assertions. The tests check rendered
behavior, requests, and response handling, rather than server-side effects.

## 3. Test Organization

The maintained frontend test inventory contains ten files:

| Test file | Recorded coverage |
| --- | --- |
| [LoginPage.test.jsx](../../../../../src/frontend/tests/LoginPage.test.jsx) | Initial route, login and registration forms, successful login, mode switching and field clearing, password reset outcomes. |
| [AuthContext.test.jsx](../../../../../src/frontend/tests/AuthContext.test.jsx) | Save and restore user state, malformed saved-user data, and logout. |
| [ApiService.test.js](../../../../../src/frontend/tests/ApiService.test.js) | Course requests, token selection, configured API destination, and request/response errors. |
| [Settings.test.jsx](../../../../../src/frontend/tests/Settings.test.jsx) | Load and add flagged words; loading error. |
| [StudentEvaluation.test.jsx](../../../../../src/frontend/tests/StudentEvaluation.test.jsx) | Evaluation loading, invalid links, completed state, validation, multiple submissions, and failed-submission retry. |
| [TeamAssignment.test.jsx](../../../../../src/frontend/tests/TeamAssignment.test.jsx) | Rendering the current Team Assignment page. |
| [Reports.test.jsx](../../../../../src/frontend/tests/Reports.test.jsx) | Course loading/filtering and report display, generation, retry, and CSV download. |
| [CourseManagement.test.jsx](../../../../../src/frontend/tests/CourseManagement.test.jsx) | Course, roster, team, invitation, launch, status, reminder, and reset-prompt UI operations. |
| [CourseManagement.resetSequencing.test.jsx](../../../../../src/frontend/tests/CourseManagement.resetSequencing.test.jsx) | Required reset ordering for queued team additions and removals. |
| [setup.test.js](../../../../../src/frontend/test/setup.test.js) | Confirms that a per-file coverage snapshot can be empty. |

The former `App.test.jsx` initial-route case is maintained in
`LoginPage.test.jsx`.

<a id="test-cases"></a>

## 4. Test Cases

Each case summarizes representative test steps and assertions in its linked
source. Regression IDs are included where the case directly covers that
recorded regression.

| Case | Objective | Steps | Expected result | Regression target | Source |
| --- | --- | --- | --- | --- | --- |
| TC-UNIT-FE-001 | Verify initial app route. | Render `App` at the initial route inside `AuthProvider`. | Professor Login heading and email, password, and Login controls appear. | — | [LoginPage.test.jsx](../../../../../src/frontend/tests/LoginPage.test.jsx) |
| TC-UNIT-FE-002 | Verify login and registration forms. | Enter credentials; submit successful login; switch modes, check cleared fields, and submit registration. | Login stores successful user data; mode changes show the relevant form and registration sends entered information. | — | [LoginPage.test.jsx](../../../../../src/frontend/tests/LoginPage.test.jsx) |
| TC-UNIT-FE-003 | Verify password reset dialog outcomes. | Request a reset under success and failure responses; cancel the dialog. | Success and failure feedback appear and cancel closes the dialog. | — | [LoginPage.test.jsx](../../../../../src/frontend/tests/LoginPage.test.jsx) |
| TC-UNIT-FE-004 | Verify authentication state lifecycle. | Call login, initialize with saved and malformed user data, then log out. | User state is saved/restored; malformed data is cleared without breaking the provider; logout removes the user. | — | [AuthContext.test.jsx](../../../../../src/frontend/tests/AuthContext.test.jsx) |
| TC-UNIT-FE-005 | Verify API service request and token/error handling. | Request a course; vary local/session tokens; exercise request/response passthrough and error responses; configure API destination. | Correct token/header and configured destination are used; successful values and rejected errors are preserved with user messages. | — | [ApiService.test.js](../../../../../src/frontend/tests/ApiService.test.js) |
| TC-UNIT-FE-006 | Verify Settings flagged-word UI. | Load words, add a word, and reject the load request. | Existing/new words render and load failure shows an error. | — | [Settings.test.jsx](../../../../../src/frontend/tests/Settings.test.jsx) |
| TC-UNIT-FE-007 | Verify StudentEvaluation form states. | Load an evaluation, simulate load failure, and render invalid-link and already-completed responses. | Evaluation details or the corresponding error, invalid-link, or completed state renders. | — | [StudentEvaluation.test.jsx](../../../../../src/frontend/tests/StudentEvaluation.test.jsx) |
| TC-UNIT-FE-008 | Verify required rating and feedback validation. | Submit without ratings, then with feedback shorter than ten characters. | Each invalid submission is rejected and no submission request is sent. | REG-CW08-12 | [StudentEvaluation.test.jsx](../../../../../src/frontend/tests/StudentEvaluation.test.jsx) |
| TC-UNIT-FE-009 | Verify multi-peer submission and retry. | Submit distinct teammate ratings/feedback; then fail a submission and retry with the entered evaluations. | Each teammate's data is submitted; failed submission retains input and permits retry. | REG-CW08-13 | [StudentEvaluation.test.jsx](../../../../../src/frontend/tests/StudentEvaluation.test.jsx) |
| TC-UNIT-FE-010 | Verify current TeamAssignment rendering. | Render the TeamAssignment page. | Team Assignment page is shown. | — | [TeamAssignment.test.jsx](../../../../../src/frontend/tests/TeamAssignment.test.jsx) |
| TC-UNIT-FE-011 | Verify reports load, filter, generate, retry, and export. | Load courses and report data, filter active courses, trigger generation failure/retry, and download CSV. | Active-course choices and report results render; retry works; CSV success/failure is reported and temporary URL is released. | — | [Reports.test.jsx](../../../../../src/frontend/tests/Reports.test.jsx) |
| TC-UNIT-FE-012 | Verify course lifecycle UI. | Load/refresh, create, edit, and delete a course; cancel deletion and simulate create failure. | Refreshed course details render; cancellation makes no delete request; failed creation retains entered details. | — | [CourseManagement.test.jsx](../../../../../src/frontend/tests/CourseManagement.test.jsx) |
| TC-UNIT-FE-013 | Verify roster operations and CSV handling. | Add, edit, delete, search roster students; upload CSV and simulate processing failure. | Roster updates/filtering render; CSV result/error appears and selected file remains available for retry. | — | [CourseManagement.test.jsx](../../../../../src/frontend/tests/CourseManagement.test.jsx) |
| TC-UNIT-FE-014 | Verify teams and membership operations. | Create/edit/delete teams; add and remove students and clear teams. | Manual creation sends the API's `{ teams: [...] }` body, shows the new empty team and refreshed count without changing student assignments; other confirmed operations refresh team list and membership counts. | — | [CourseManagement.test.jsx](../../../../../src/frontend/tests/CourseManagement.test.jsx) |
| TC-UNIT-FE-015 | Verify invitation, launch, status, reminder, and reset UI. | Send invitations, exercise health-check and send failures, launch evaluations, view status, request reminders, and reset evaluations. | UI reports outcomes and refreshed completion status; failed actions do not claim success. Mocked reminder confirmation does not establish recipient selection or email delivery. | — | [CourseManagement.test.jsx](../../../../../src/frontend/tests/CourseManagement.test.jsx) |
| TC-UNIT-FE-016 | Verify cancellation of a required reset. | Queue a team add after evaluations were sent, then cancel the reset prompt. | Neither reset nor membership request is sent; displayed membership counts remain unchanged. | REG-CW05-07 | [CourseManagement.test.jsx](../../../../../src/frontend/tests/CourseManagement.test.jsx) |
| TC-UNIT-FE-017 | Verify required-reset failure blocks membership add/removal. | Attempt add and removal when evaluations were sent; reject the required reset. | Membership mutation is not sent and membership UI remains; failure is shown. | REG-CW05-08 | [CourseManagement.test.jsx](../../../../../src/frontend/tests/CourseManagement.test.jsx), [CourseManagement.resetSequencing.test.jsx](../../../../../src/frontend/tests/CourseManagement.resetSequencing.test.jsx) |
| TC-UNIT-FE-018 | Verify pending reset ordering before membership add/removal. | Queue each membership action and confirm reset; inspect the request order. | Add/removal request follows only a successful reset. | REG-CW05-08 | [CourseManagement.resetSequencing.test.jsx](../../../../../src/frontend/tests/CourseManagement.resetSequencing.test.jsx) |

The reset cases exercise the UI/API boundary and do not prove MongoDB
persistence.

## 5. Execution Instructions

Prerequisites: Node.js `^22.22.2 || ^24.15.0 || >=26.0.0`, npm 9 or newer,
and frontend dependencies installed. The tests require no running backend,
database, SMTP server, or other application service.

Run the frontend suite from the repository root:

```bash
npm test
```

Run the focused reset-sequencing suite with:

```bash
npx vitest run src/frontend/tests/CourseManagement.resetSequencing.test.jsx
```

<a id="verification-results"></a>

## 6. Test Results

Prior recorded local verification: October 31, 2026, revision `d0088f7`.

| Command | Recorded result | Detailed record |
| --- | --- | --- |
| `npm test` | 10 frontend test files, 85 tests passed | [October 31 recorded unit results](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/blob/dd7d26d1aa3b4431b6cd477271e19ca8f792435f/docs/Team-P25-02/modernization/implementation/testing/unit-testing.md#test-results) |

The October 28, 2026 reset-sequencing follow-up at revision `4721cbf`
recorded a focused pass (1 file, 3 tests) and a full frontend pass (9 files,
68 tests) on Node 24.21.0 and npm 11.19.0. Lint, formatting, and the frontend
build also passed. Before the fix, the queued add/remove rejection checks
failed because membership requests followed a failed reset. These were
mocked component checks without running application services. See the
[dated reset verification at revision 4721cbf](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/blob/4721cbfbf683064351dc65d377fe8b3c4aac5ca9/docs/Team-P25-02/modernization/implementation/testing/frontend-unit-test-validation.md#october-28-follow-up-required-reset-before-team-changes).

On November 13, 2026, the `fix/staging-invitations-teams` worktree rebased onto
`dc5f32e` passed `npm test -- --run
src/frontend/tests/CourseManagement.test.jsx` (the package script selected all
10 frontend files, 85 tests). The corrected Create Team component case asserts
the API envelope, an empty team in the refreshed list, the course count, and
unchanged synthetic student assignment. The API was mocked; this is not a
backend persistence, hosted CI, or Render result.

## 7. Limitations and Remaining Coverage

- Frontend mocks verify UI requests and response handling, not backend
  authorization, persistence, email recipient selection/delivery, or live
  service behavior.
- The recorded pass count does not establish assertion quality, complete
  workflow verification, a CI threshold, or fulfillment of a numerical
  workflow-coverage target.
- Settings has only flagged-word load/add/error coverage, and TeamAssignment
  only verifies the current page render; neither establishes AI settings or
  automatic assignment behavior.
