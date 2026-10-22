# Frontend Unit Test Validation

## Issue

GitHub Issue #30 - Implement frontend unit tests.

## Goal

The goal of this work is to test useful frontend behavior in PEERS using Vitest and React Testing Library. The tests check important frontend actions without requiring the real backend, MongoDB, or email service when those services can be mocked.

## Test Files and Coverage

| Test File | Coverage |
| --- | --- |
| `LoginPage.test.jsx` | Login form display, typing email and password, successful login, registration mode, form clearing, registration submission, password reset success, password reset failure, and canceling password reset. |
| `AuthContext.test.jsx` | Saving a logged-in user, loading a saved user, and logging out. |
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