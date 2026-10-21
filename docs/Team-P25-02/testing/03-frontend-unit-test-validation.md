# Frontend Unit Test Validation

## Issue

GitHub Issue #30 - Implement frontend unit tests.

## Goal

The goal of this work is to test useful frontend behavior in PEERS using Vitest and React Testing Library.

## Test Files and Coverage

| Test file | Coverage |
| --- | --- |
| [`LoginPage.test.jsx`](../../../src/frontend/tests/LoginPage.test.jsx) | Initial login-form rendering, login-field interaction, registration-mode navigation, and password-reset success behavior with a mocked Axios response. |

The original initial-route test from `App.test.jsx` was merged into
`LoginPage.test.jsx`; the separate `App.test.jsx` file is no longer maintained.

## Frontend Unit Test Cases

| Test ID | Area | Purpose and expected result | Source |
| --- | --- | --- | --- |
| UNIT-FE-001 | Login form rendering | The initial route renders the professor login heading, email field, password field, and Login button. | [`LoginPage.test.jsx`](../../../src/frontend/tests/LoginPage.test.jsx) |
| UNIT-FE-002 | Login form interaction | Entering an email address and password updates the corresponding form fields. | [`LoginPage.test.jsx`](../../../src/frontend/tests/LoginPage.test.jsx) |
| UNIT-FE-003 | Registration navigation | Selecting the registration action displays the professor registration heading, full-name field, department field, and Register button. | [`LoginPage.test.jsx`](../../../src/frontend/tests/LoginPage.test.jsx) |
| UNIT-FE-004 | Password reset | Submitting a password-reset request with a mocked Axios response displays the expected success message and calls the reset endpoint. | [`LoginPage.test.jsx`](../../../src/frontend/tests/LoginPage.test.jsx) |

The four frontend unit tests are implemented in one test file and use
synthetic browser state and mocked network behavior.

## Test Tools

The tests use:

- Vitest
- React Testing Library
- Testing Library user-event
- Mocked Axios responses

The password reset test does not contact the real backend. The Axios response is mocked so the test is repeatable and does not depend on a running server.

## Commands Used

Run the frontend test suite:

```bash
npm test