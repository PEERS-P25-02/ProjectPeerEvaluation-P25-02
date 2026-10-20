# Frontend Unit Test Validation

## Issue

GitHub Issue #30 - Implement frontend unit tests.

## Goal

The goal of this work is to test useful frontend behavior in PEERS using Vitest and React Testing Library.

## Test File

The new frontend tests are located in:

`src/frontend/tests/LoginPage.test.jsx`

## Tested Behaviors

The following frontend behaviors were tested:

1. The user can type an email and password into the professor login form.
2. The user can switch from login mode to professor registration mode.
3. The user can submit a password reset request and see the expected success message when the API response is mocked.

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