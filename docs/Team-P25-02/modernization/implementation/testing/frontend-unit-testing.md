# Frontend Unit Testing

## Purpose and Scope

This record documents frontend unit and component test organization, case
coverage, execution instructions, the latest dated verification result, and
remaining limitations. Tests use Vitest and React Testing Library to exercise
frontend behavior with synthetic data and mocked API boundaries where needed.
They do not establish backend behavior, database persistence, email delivery,
or full browser end-to-end behavior.

## Testing Environment and Tools

The frontend tests use Vitest, jsdom, React Testing Library,
`@testing-library/user-event`, `@testing-library/jest-dom`, mocked Axios/API
responses, and React Router `MemoryRouter` where routing is needed. Mocks keep
the unit/component checks independent of MongoDB, SMTP, and a running backend.

## Test Organization

The current frontend test inventory contains ten files:

| Test file | Recorded coverage |
| --- | --- |
| [LoginPage.test.jsx](../../../../../src/frontend/tests/LoginPage.test.jsx) | Login and registration form behavior, successful login, mode switching and field clearing, password reset outcomes, and the initial route formerly tested in `App.test.jsx`. |
| [AuthContext.test.jsx](../../../../../src/frontend/tests/AuthContext.test.jsx) | Saving and restoring a user, malformed saved-user data, and logout. |
| [ApiService.test.js](../../../../../src/frontend/tests/ApiService.test.js) | Course requests and authentication-token behavior in API requests. |
| [Settings.test.jsx](../../../../../src/frontend/tests/Settings.test.jsx) | Loading and adding flagged words and handling loading errors. |
| [StudentEvaluation.test.jsx](../../../../../src/frontend/tests/StudentEvaluation.test.jsx) | Evaluation loading, invalid links, completed evaluations, input validation, submission, and retry behavior. |
| [TeamAssignment.test.jsx](../../../../../src/frontend/tests/TeamAssignment.test.jsx) | Rendering the current Team Assignment page. |
| [Reports.test.jsx](../../../../../src/frontend/tests/Reports.test.jsx) | Course loading/filtering and report display, generation, and download behavior. |
| [CourseManagement.test.jsx](../../../../../src/frontend/tests/CourseManagement.test.jsx) | Course loading/refresh, course and team operations, roster behavior, launch/invitation/reminder requests, and reset-prompt cases. |
| [CourseManagement.resetSequencing.test.jsx](../../../../../src/frontend/tests/CourseManagement.resetSequencing.test.jsx) | Required reset ordering for queued team additions and removals. |
| [setup.test.js](../../../../../src/frontend/test/setup.test.js) | Confirms that a per-file coverage snapshot can be empty. |

`App.test.jsx` is no longer maintained; its initial-route test was merged into
`LoginPage.test.jsx`.

## Test Cases

| Case or area | Behavior checked | Source |
| --- | --- | --- |
| UNIT-FE-001: Initial login route | Run `npm test`; render `App` at the initial route inside `AuthProvider`. The Professor Login heading, email field, password field, and Login button are present. | [LoginPage.test.jsx](../../../../../src/frontend/tests/LoginPage.test.jsx) |
| Authentication | Login and registration behavior, successful login storage, switching modes and clearing fields, password-reset success/failure/cancel, saved-user restoration, malformed persisted data, and logout. | [LoginPage.test.jsx](../../../../../src/frontend/tests/LoginPage.test.jsx), [AuthContext.test.jsx](../../../../../src/frontend/tests/AuthContext.test.jsx) |
| API service | Course retrieval, local-token precedence over session token, configured API destination, request/response passthrough, and timeout/network/server/validation errors. | [ApiService.test.js](../../../../../src/frontend/tests/ApiService.test.js) |
| Settings, evaluation, and team assignment | Flagged-word load/add/error; evaluation loading, invalid/completed states, required ratings and feedback, distinct multi-teammate submissions, failed-submission retry and success; current Team Assignment page rendering. | [Settings.test.jsx](../../../../../src/frontend/tests/Settings.test.jsx), [StudentEvaluation.test.jsx](../../../../../src/frontend/tests/StudentEvaluation.test.jsx), [TeamAssignment.test.jsx](../../../../../src/frontend/tests/TeamAssignment.test.jsx) |
| Reports | Course loading and active-course filtering, errors, rendered results, generation retry, and CSV download success/failure and URL cleanup. | [Reports.test.jsx](../../../../../src/frontend/tests/Reports.test.jsx) |
| Course management | Course load/refresh, empty/error states, create/edit/delete and cancel/retry, student and CSV behavior, team/membership updates, invitation requests, launch health check/status, reminders, and completion progress. Mocked reminder confirmation does not establish backend recipient selection or actual email delivery. | [CourseManagement.test.jsx](../../../../../src/frontend/tests/CourseManagement.test.jsx) |
| REG-CW05-07: Reset prompt canceled | Canceling the reset prompt for a queued team add issues neither reset nor membership request and retains the original team/available-student counts. | [CourseManagement.test.jsx](../../../../../src/frontend/tests/CourseManagement.test.jsx) |
| REG-CW05-08: Reset failure and sequencing | If a required reset fails for a queued add or removal, no membership mutation follows and membership remains. Pending-reset cases verify add/remove requests follow only a successful reset. | [CourseManagement.test.jsx](../../../../../src/frontend/tests/CourseManagement.test.jsx), [CourseManagement.resetSequencing.test.jsx](../../../../../src/frontend/tests/CourseManagement.resetSequencing.test.jsx) |

The rendered reset checks exercise the UI/API boundary; they do not prove
MongoDB persistence.

### Priority-workflow baseline

This frontend baseline is partial evidence for the identified workflows, not
complete cross-layer verification.

| Workflow | Frontend unit evidence |
| --- | --- |
| CW-01 Professor authentication and authorized access | Login success/failure, authentication state/storage, navigation, and API authorization headers; server authorization needs backend verification. |
| CW-02 Course creation and management | Load/refresh, create/edit/delete, cancel, and failed-create retry. |
| CW-03 Roster upload and processing | Required student data, student creation, CSV FormData, result/error feedback; parsing and persistence are backend responsibilities. |
| CW-04 Team organization | Team creation/counts and membership add/remove with refresh. |
| CW-05 Evaluation setup and launch | Supplied rubric rendering/submission and launch request, confirmation, refreshed status; this does not imply rubric-editing functionality. |
| CW-06 Individualized link/token access | Token-specific form request, supplied details, failed access, and completed response; token rules need backend verification. |
| CW-07 Invitation distribution | Course/team send requests, success feedback, and student-specific completion status. |
| CW-08 Evaluation submission | Required feedback/ratings, distinct multi-teammate input, success, and retained-input retry. |
| CW-09 Results review/export | Report settings/results, generation retry, and CSV download success/failure. |
| SW-04 Reminders | Selected-course reminder request, refreshed status, and returned confirmation. |

Backend rules, MongoDB relationships/persistence, SMTP delivery, and full
browser journeys require their respective backend, integration, or E2E
evidence. This baseline is not exhaustive and introduces no numerical coverage
target.

## Execution Instructions

Run the frontend unit/component suite from the repository root:

```bash
npm test
```

Run the focused reset-sequencing suite with:

```bash
npx vitest run src/frontend/tests/CourseManagement.resetSequencing.test.jsx
```

## Verification Results

Latest recorded local verification: October 31, 2026, revision `d0088f7`.

| Command | Recorded result | Detailed record |
| --- | --- | --- |
| `npm test` | 10 frontend test files, 85 tests passed | [October 31 recorded unit results](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/blob/dd7d26d1aa3b4431b6cd477271e19ca8f792435f/docs/Team-P25-02/modernization/implementation/testing/unit-testing.md#test-results) |

This is existing dated documentation evidence; no test run was performed for
this document update or at the current branch revision. A local pass does not
establish that the corresponding CI check is required before merging.

## Limitations and Remaining Work

- Frontend mocks verify UI requests and response handling, not backend
  authorization, persistence, email recipient selection/delivery, or live
  service behavior.
- The recorded test pass count does not establish assertion quality,
  complete workflow verification, a CI threshold, or fulfillment of a
  numerical workflow-coverage target.
- The [regression coverage gap record](regression-coverage-gaps.md) tracks
  current cross-layer gaps; broader integration, regression, end-to-end, and
  live-service validation remain separate from these frontend unit tests.
- Settings/AuthContext/current Team Assignment placeholder tests are retained
  without adding AI settings or automatic-assignment functionality.
