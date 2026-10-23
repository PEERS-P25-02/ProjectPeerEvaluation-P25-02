# Frontend Unit Test Validation

## Issue

GitHub Issue #30 - Implement frontend unit tests.

**Record note:** The original 29-test validation is preserved below. The October 22 follow-up records expanded coverage on `30-frontend-unit-tests`.

## Goal

The goal of this work is to test useful frontend behavior in PEERS using Vitest and React Testing Library. The tests check important frontend actions without requiring the real backend, MongoDB, or email service when those services can be mocked.

## Test Files and Coverage

| Test File | Coverage |
| --- | --- |
| `LoginPage.test.jsx` | Login form display, typing email and password, successful login, registration mode, form clearing, registration submission, password reset success, password reset failure, and canceling password reset. |
| `AuthContext.test.jsx` | Saving a logged-in user, loading a saved user, clearing malformed saved user data, and logging out. |
| `ApiService.test.js` | Fetching course data and adding authentication tokens to API requests. |
| `Settings.test.jsx` | Loading flagged words, adding a new flagged word, and handling a loading error. |
| `StudentEvaluation.test.jsx` | Loading evaluation information, handling an invalid evaluation link, and showing an already-completed evaluation. |
| `TeamAssignment.test.jsx` | Displaying the current Team Assignment page. |
| `Reports.test.jsx` | Loading the Reports page, showing only active courses, and handling course-loading errors. |
| `CourseManagement.test.jsx` | Loading active courses, displaying refreshed course information, showing an empty-course message, and handling loading errors. |

The original initial-route test from `App.test.jsx` was merged into `LoginPage.test.jsx`. The separate `App.test.jsx` file is no longer maintained.

## Frontend Unit Test Cases

### Login and Registration

- The professor login form appears on the starting page.
- A user can type an email and password.
- A successful login sends the expected login information and stores the returned user data.
- The user can switch from login mode to professor registration mode.
- Form fields are cleared when switching between login and registration modes.
- Registration sends the correct professor information.
- A successful password reset request shows the expected success message.
- A failed password reset request shows an error message.
- The password reset window closes when Cancel is selected.

### Authentication Context

- Login stores the current user.
- A saved user can be loaded from local storage.
- Malformed saved user data is removed without breaking provider rendering.
- Logout removes the saved user.

### API Service

- A course can be requested by course ID.
- A token saved in local storage is added to the Authorization header.
- A session token is used when no local token exists.
- No Authorization header is added when no token exists.

### Settings

- Current flagged words are loaded and displayed.
- A new flagged word can be added.
- An error message appears if flagged words cannot be loaded.

### Student Evaluation

- Evaluation information is loaded and displayed.
- An invalid evaluation link shows an error message.
- A completed evaluation shows the completed screen.

### Team Assignment

- The current Team Assignment page is displayed.

### Reports

- The Reports page loads and requests the course list.
- Only active courses are shown in the course selection list.
- An error message appears if courses cannot be loaded.

### Course Management

- Active courses are requested and displayed.
- Updated course information is loaded with `getCourseById`.
- A message appears when no active courses are found.
- An error message appears when courses cannot be loaded.

## Test Tools

The frontend tests use:

- Vitest
- React Testing Library
- Testing Library user-event
- jsdom
- Mocked Axios/API responses
- React Router MemoryRouter for pages that require routing

Mocks are used when needed so the frontend tests can run without depending on the real backend, MongoDB, or email service. This helps make the tests repeatable.

## Commands Used

Run the frontend test suite:

```bash
npm test
```

Check frontend test files with ESLint:

```bash
npx eslint src/frontend/tests
```

Check frontend test formatting with Prettier:

```bash
npx prettier --check "src/frontend/tests/**/*.{js,jsx}"
```

## Test Results

The final frontend test suite completed successfully.

```text
Test Files  8 passed (8)
Tests       29 passed (29)
```

All 29 frontend tests passed.

ESLint was also run on the frontend test folder and completed with no errors.

Prettier was run on all frontend test files and reported:

```text
All matched files use Prettier code style!
```

Some tests intentionally create error situations, such as an invalid evaluation link or failed course request. These can print error messages to the terminal during testing. MUI also prints Grid migration warnings from existing frontend code. These messages did not cause the test suite to fail.

## Validation Result

Issue #30 now includes frontend unit-test coverage for several important PEERS areas instead of only the login page. The tests cover authentication, API behavior, settings, student evaluations, team assignment, reports, and course management.

The final local validation result is:

- 8 test files passed
- 29 tests passed
- ESLint passed
- Prettier passed

The frontend unit-test work is ready to be documented, committed, pushed, and reviewed through the existing Issue #30 pull request.

## Issue #31 Failure and Boundary Follow-up

The frontend failure/boundary review added coverage for corrupted persisted
authentication state. When `localStorage.user` contains invalid JSON, the
provider removes the invalid value and renders the logged-out state instead of
throwing during application startup. This case is implemented in
[`AuthContext.test.jsx`](../../../src/frontend/tests/AuthContext.test.jsx).

The backend companion case is documented in
[`02-backend-unit-testing-implementation.md`](02-backend-unit-testing-implementation.md).

### Recorded Validation

The focused frontend and backend suites passed after this follow-up:

```text
Frontend: 8 test files, 63 tests passed
Backend: 9 test files, 49 tests passed
```

These cases supplement the existing Issue #31 coverage; they do not replace
integration or end-to-end validation.

## October 22 Follow-up: Frontend Coverage Expansion

The branch adds 28 tests, bringing the frontend suite to 57 tests in the same eight files. Application code, package manifests, lockfiles, and test-runner configuration are unchanged.

| Area | Added or strengthened verification |
| --- | --- |
| Login | Successful navigation is awaited through a mocked destination; failed credential/network requests retain the login screen and leave authentication storage empty. |
| Course loading | Distinct initial and refreshed course data verify that the displayed name and student/team counts use the refreshed response. |
| Course management | Create, edit, cancel/delete, and failed-create retry verify request payloads and the resulting course list or retained form state. |
| Rosters and teams | Required student fields, student creation, CSV FormData, CSV error/retry state, team creation/count refresh, and student team membership are exercised through the UI. |
| Student evaluation | Missing ratings and short feedback block requests; two teammates submit distinct numeric ratings and feedback; failed submission retains input for retry; successful submission and return navigation are verified. |
| Reporting | Mean/curved settings, rendered results, peer feedback, generation failure/retry, URL-selected report generation, and CSV download/error/URL cleanup are covered. |
| API client | Persistent-token precedence, configured API destination, response/request passthrough, and timeout/network/server/validation errors are verified. |

All requests use synthetic data and mocked API boundaries. Download tests preserve the component's link creation while replacing jsdom's missing browser download APIs. The tests require no MongoDB, SMTP, or running backend.

### Recorded Validation

Validation ran in an isolated review checkout based on branch commit `01224cb` using Node 24.21.0 and npm 11.19.0.

| Check | Result |
| --- | --- |
| Frontend Vitest with V8 coverage | 8 files, 57 tests passed. |
| Backend Vitest | Existing 9 files, 45 tests passed. |
| Repository lint and formatting | Passed with zero lint diagnostics. |
| Frontend production build | Passed; existing bundle-size warning remains. |
| Refresh regression experiment | Returning stale course data now fails the strengthened course-loading test. |
| Navigation regression experiment | Omitting successful-login navigation now fails the login-success test. |

The two regression experiments altered code only in memory during test execution; their expected failures are separate from the passing unmodified suite.

### Measured Coverage

Matching Vitest/V8 5.0.5 tooling was used outside the repository dependencies. The measurement includes all 15 frontend/entry JavaScript and JSX application files (`src/frontend/` and `src/index.jsx`), including unexecuted files, and excludes tests and setup. No permanent coverage dependency, npm command, threshold, or CI gate is added.

| Metric | Before | After |
| --- | ---: | ---: |
| Lines | 29.57% | 53.38% |
| Branches | 22.07% | 46.02% |
| Functions | 17.07% | 44.94% |
| Statements | 28.52% | 51.79% |

| Area | Line coverage after expansion |
| --- | ---: |
| Login | 96.66% |
| Student evaluation | 96.92% |
| Reports | 83.89% |
| Course management | 40.58% |
| Shared API service | 100% |

Coverage records execution rather than assertion quality. The regression experiments above additionally verify the two previously weak assertions. This is expanded isolated unit coverage on the feature branch, not complete workflow verification on main. Password-update-page coverage, additional course/team/invitation failure paths, integration, end-to-end, real downloads, and live-service verification remain separate work. Existing Settings/AuthContext/placeholder tests are retained without expanding AI or automatic-assignment functionality.


## October 22 Follow-up: Priority-Workflow Baseline

The user selected baseline frontend unit coverage for all documented priority workflows, with additional boundary cases and safeguards deferred to a later issue. Five tests are added to `CourseManagement.test.jsx`, bringing the frontend suite from 57 to 62 tests in eight files. Application code, dependencies, and configuration are unchanged.

The added tests verify:

- Removing a student sends the selected course/team/student request and refreshes team membership and available students.
- Sending team invitations uses the selected course/team endpoint and displays success feedback.
- Launching course evaluations from the status dialog performs the health check, sends the selected course request, confirms success, and displays refreshed completion progress.
- Completion status shows course progress, the team, and the correct completed/pending status beside each student.
- Requesting reminders uses the selected course endpoint, refreshes status, and displays the returned confirmation.

All requests are mocked and use synthetic data. The reminder test verifies the frontend request and response handling; its mocked confirmation does not establish backend recipient selection or actual email delivery.

### Priority-Workflow Traceability

The scope comes from [Critical Workflow Identification](../critical-workflow-identification/01-scope-and-classification.md) and the [Automated Testing Strategy](../automated-testing-strategy/01-testing-foundations.md#04-priority-workflow-scope). The following is a frontend unit baseline, not complete verification of each workflow across the system.

| Workflow | Frontend unit baseline |
| --- | --- |
| CW-01: Professor authentication and authorized access | Login success/failure, authentication storage and state, navigation, and API authorization headers. Server access-control decisions require backend verification. |
| CW-02: Course creation and management | Course loading/refresh, create/edit/delete, confirmation cancellation, and failed-create retry. |
| CW-03: Student roster upload and processing | Student required fields/creation, selected CSV FormData, returned results, and processing-error feedback. CSV parsing and persistence are backend responsibilities. |
| CW-04: Student team organization | Team creation and refreshed counts; adding and removing students with the selected course/team/student association and refreshed membership. |
| CW-05: Evaluation activity setup and launch | Supplied rubric rendering and rating submission, plus the course launch request, confirmation, and refreshed status. This tests existing frontend behavior without introducing rubric-editing functionality. |
| CW-06: Individualized link/token access | Token-specific form request, supplied course/evaluator/teammate information, failed access, and already-completed response. Token creation/validation rules require backend verification. |
| CW-07: Evaluation invitation distribution | Course and team send requests, success feedback, and completion status with student-specific results. |
| CW-08: Student evaluation submission | Required ratings/feedback, distinct numeric ratings and feedback for multiple teammates, successful confirmation, and retained-input retry. |
| CW-09: Results review and export | Report requests/settings, displayed scores and feedback, generation retry, and CSV download success/failure. |
| SW-04: Reminders (medium priority) | Selected-course reminder request, refreshed status, and returned confirmation. |

Backend unit tests remain responsible for isolated token, authorization, CSV, rubric, calculation, and recipient-selection rules. MongoDB relationships/persistence, SMTP delivery, and full browser journeys require integration and end-to-end verification. This follow-up does not assess the completeness of those other suites.

Additional launch/reminder failures, team changes after evaluations have been sent, reset safeguards, partially completed multi-teammate forms, pending-state duplicate-click prevention, and other boundaries remain deferred. Baseline coverage is not a claim of exhaustive protection or a numerical coverage target.

### Recorded Baseline Validation

Validation ran in an isolated review checkout containing the approved 57-test update and this proposed follow-up, based on branch commit `01224cb`, using Node 24.21.0 and npm 11.19.0.

| Check | Result |
| --- | --- |
| Frontend Vitest | 8 files, 62 tests passed. |
| Repository lint and formatting | Passed with zero lint diagnostics. |
| Frontend production build | Passed; existing bundle-size warning remains. |

The earlier 57-test V8 measurement is preserved as historical evidence; no new coverage percentage or threshold is introduced by this follow-up.
