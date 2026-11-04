# Authentication and Authorization Integration Testing Implementation

## Purpose and Scope

This record describes backend integration checks for professor authentication and resource authorization, and student evaluation-link capabilities. It covers the access boundaries in [CW-01, CW-02, CW-06, CW-08, and CW-09](../../../requirements/workflows/04-critical-peers-workflows.md).

The application uses two access models: professor accounts authenticate with login-issued JWTs, while students use individual evaluation-link tokens. There is no administrator/student JWT role hierarchy. These tests exercise Express routes, JWT verification, MongoDB records, and side effects through the isolated integration environment.

## Testing Environment and Tools

The tests use actual HTTP requests and database state rather than mocked authentication middleware or persistence. Authorization scenarios use synthetic accounts and create a second professor with a separate course, team, and students. Mailpit checks confirm invitation denials do not send messages.

Use the prerequisites and isolation safeguards in the [integration test environment record](integration-test-environment.md). Docker and Compose must be available. The root runner provides each invocation with an isolated database and inbox and an ephemeral JWT secret. Tests use that secret for expired credentials and valid controls; wrong-signature credentials use a separate synthetic key. Do not print tokens or secrets.

## Test Organization

**Backend integration:** [`authentication.test.js`](../../../../../src/backend/tests/integration/authentication.test.js) checks persisted professor login and credential rejection. [`authenticationAccess.test.js`](../../../../../src/backend/tests/integration/authenticationAccess.test.js) checks credential validation, protected-route boundaries, logout behavior, and professor/student credential separation. [`authorization.test.js`](../../../../../src/backend/tests/integration/authorization.test.js) checks professor resource isolation, protected fields, student recipients, and invalidated evaluation-link tokens.

**Frontend unit:** [`LoginPage.test.jsx`](../../../../../src/frontend/tests/LoginPage.test.jsx) and [`AuthContext.test.jsx`](../../../../../src/frontend/tests/AuthContext.test.jsx) cover login and client authentication state. This source organization does not imply that the frontend suites ran as part of the backend integration result below.

## Test Cases

| Case group | Actions and expected outcome | Source |
| --- | --- | --- |
| Persisted professor login | Log in with saved credentials, check identity and `last_login`, and use the returned token on a protected course request. Try a wrong password, unknown email, and missing credentials. Successful login returns a usable token and updates intended login state; failures disclose no identity or token and leave stored state unchanged. | [`authentication.test.js`](../../../../../src/backend/tests/integration/authentication.test.js) |
| Credential validation | Attempt a protected course read and course-name update with missing, empty, malformed, wrong-scheme, tampered, expired, or wrongly signed credentials. Each request returns 401 without protected data, stored mutation, or inbox change. | [`authenticationAccess.test.js`](../../../../../src/backend/tests/integration/authenticationAccess.test.js) |
| Mounted-route protection | Omit credentials on mounted protected course, roster, team, evaluation-management, reporting/export, logout, settings, and AI routes. Requests return 401 before protected data or side effects are exposed. These are access-boundary checks, not AI or migration behavior checks. | [`authenticationAccess.test.js`](../../../../../src/backend/tests/integration/authenticationAccess.test.js) |
| JWT controls and logout | Access an owned course with a valid control JWT and a login-issued token, log out, then reuse the login-issued token. Valid, unexpired JWTs are accepted; expired JWTs are rejected. Logout does not revoke an issued JWT server-side, and the same token remains usable afterward. | [`authenticationAccess.test.js`](../../../../../src/backend/tests/integration/authenticationAccess.test.js) |
| Credential separation | Use a student evaluation-link token as professor Bearer authorization, then use a professor JWT on student form, status, and submission endpoints. Credentials are not interchangeable; denied requests do not mutate state. | [`authenticationAccess.test.js`](../../../../../src/backend/tests/integration/authenticationAccess.test.js) |
| Professor and child-resource isolation | Each professor reads and updates owned course resources, then attempts foreign-course and foreign-child reads or writes, including roster, team, invitation, reset, report, and export operations. Owned operations succeed; foreign-course and foreign-child requests return 404 without disclosure, stored changes, or sent invitations. | [`authorization.test.js`](../../../../../src/backend/tests/integration/authorization.test.js) |
| Protected fields and relationships | Submit identity, ownership, relationship, counter, capability-token, completion, and MongoDB operator fields alongside supported edits or creation. Supported edits persist while protected values and unrelated records remain unchanged. | [`authorization.test.js`](../../../../../src/backend/tests/integration/authorization.test.js) |
| Student recipient and link-token boundaries | Try submissions to self, foreign-course, nonexistent, and ineligible team recipients, including a valid peer before a forbidden recipient. Try a supported teamless same-course recipient, then reset a course and reuse its old token. Forbidden submissions return 400 without writes; the supported fallback succeeds; reset invalidates old form, status, and submission access with 404 responses. | [`authorization.test.js`](../../../../../src/backend/tests/integration/authorization.test.js) |

## Execution Instructions

Run focused access checks from the repository root:

```bash
npm run test:integration -- authentication.test.js authenticationAccess.test.js authorization.test.js
```

Run the complete service-backed suite to check compatibility with other integration workflows:

```bash
npm run test:integration
```

Review the runner output and `result.json` under ignored `test-results/integration/<run-id>/` for completion and cleanup. A local pass alone does not establish CI enforcement.

## Verification Results

The October 31, 2026 full integration run passed 200 tests across 15 files at revision `d0088f7`; the runner exited successfully and verified cleanup. The run summary is recorded in the [integration test results at commit dd7d26d](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/blob/dd7d26d1aa3b4431b6cd477271e19ca8f792435f/docs/Team-P25-02/modernization/implementation/testing/integration-testing.md#test-results). The integration suite includes the authentication and authorization test files.

The test sources and assertions are **implemented**. This dated full-suite result is local **verified** evidence for that revision. It does not establish that every authentication and authorization case is selected or CI-enforced on every change.

## Limitations and Remaining Work

- Logout is client-side and does not revoke an issued JWT. Tests do not promise immediate revocation after account deletion or password changes.
- MFA, refresh tokens, exhaustive permissions beyond covered routes, token entropy/uniqueness, and browser login or student-link navigation are not established here.
- Mailpit captures invitation messages but does not establish external email delivery. Browser behavior is documented separately in the [end-to-end testing record](end-to-end-testing.md).
- Legacy migration and automatic-assignment routes receive authentication-boundary checks, not functional approval.
- Account recovery remains a separate test scope.
- Recipient eligibility is checked before submission writes. Later rating/feedback validation, duplicate recipients, concurrent submissions, and database rollback are covered by the [submission-integrity cases and results](api-database-integration.md#5-submission-integrity).
