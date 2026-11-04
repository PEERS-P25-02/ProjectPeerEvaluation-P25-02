# Authentication and Authorization Integration Testing Implementation

## 1. Overview

This record describes backend integration checks for professor authentication, professor resource authorization, and student evaluation-link capabilities. It covers access boundaries in [CW-01, CW-02, CW-06, CW-08, and CW-09](../../../requirements/workflows/04-critical-peers-workflows.md).

The application uses two access models: professors authenticate with login-issued JWTs, while students use individual evaluation-link tokens. There is no administrator/student JWT role hierarchy. These tests exercise Express routes, JWT verification, MongoDB records, and side effects through the isolated integration environment.

## 2. Testing Strategy

The tests send actual HTTP requests and inspect database state rather than mocking authentication middleware or persistence. Authorization scenarios use synthetic accounts and create a second professor with a separate course, team, and students. Mailpit checks confirm invitation denials do not send messages.

Use repository-supported Node.js and npm, Docker with Linux container support, and Docker Compose v2.24 or later. Follow the isolation safeguards in the [integration test environment record](integration-test-environment.md). The root runner provides each invocation with an isolated database and inbox and an ephemeral JWT secret. Tests use that secret for expired credentials and valid controls; wrong-signature credentials use a separate synthetic key. Do not print tokens or secrets.

## 3. Test Organization

**Backend integration:** [`authentication.test.js`](../../../../../src/backend/tests/integration/authentication.test.js) checks persisted professor login and credential rejection. [`authenticationAccess.test.js`](../../../../../src/backend/tests/integration/authenticationAccess.test.js) checks credential validation, protected-route boundaries, logout behavior, and professor/student credential separation. [`authorization.test.js`](../../../../../src/backend/tests/integration/authorization.test.js) checks professor resource isolation, protected fields, student recipients, and invalidated evaluation-link tokens.

**Related frontend unit tests:** [`LoginPage.test.jsx`](../../../../../src/frontend/tests/LoginPage.test.jsx) and [`AuthContext.test.jsx`](../../../../../src/frontend/tests/AuthContext.test.jsx) cover login and client authentication state. They are separate suites and are not part of the backend integration result below.

<a name="test-cases"></a>

## 4. Test Cases

Each row describes one observable behavior. TC-INT-100 through TC-INT-103 correspond one-to-one, in order, to historical AUTH-33-01 through AUTH-33-04; retain that mapping when updating the RTM. The incoming `#test-cases` anchor is retained for the RTM and [integration testing record](integration-testing.md#test-cases). REG-CW01-01 is supported by the login API case, while its planned browser journey remains separate.

| Test Case | Objective | Steps | Expected Result | Regression Target | Source |
| --- | --- | --- | --- | --- | --- |
| TC-INT-100 | Authenticate a stored professor | Read the fixture professor; POST correct credentials; inspect the returned identity and stored `last_login`; use the token on the protected course list. | HTTP 200; identity and token match the stored account; `last_login` agrees with response and request time; password remains unchanged; owned course list is returned. | REG-CW01-01 | [`authentication.test.js`](../../../../../src/backend/tests/integration/authentication.test.js) |
| TC-INT-101 | Reject an incorrect password | Snapshot professors; POST the fixture email with a wrong password. | HTTP 401 `AUTH_ERROR`; no token or professor details; stored snapshot unchanged. | REG-CW01-02 | [`authentication.test.js`](../../../../../src/backend/tests/integration/authentication.test.js) |
| TC-INT-102 | Reject an unknown email | Snapshot professors; POST an unknown synthetic email. | HTTP 401 `AUTH_ERROR`; no token or professor details; no account creation or stored mutation. | — | [`authentication.test.js`](../../../../../src/backend/tests/integration/authentication.test.js) |
| TC-INT-103 | Reject missing login credentials | Snapshot professors; POST an empty login body. | HTTP 400 `VALIDATION_ERROR`; no token or professor details; stored snapshot unchanged. | REG-CW01-03 | [`authentication.test.js`](../../../../../src/backend/tests/integration/authentication.test.js) |
| TC-INT-104 | Reject invalid professor credentials | For each of seven cases—missing header, empty Bearer credential, malformed Bearer credential, wrong authorization scheme, tampered JWT, expired JWT, and wrong-signature JWT—send GET and PUT to the fixture course. | Each request returns 401 without protected data, database mutation, or inbox change. The seven variants are exercised on these two representative course routes, not every route. | REG-CW01-06 | [`authenticationAccess.test.js`](../../../../../src/backend/tests/integration/authenticationAccess.test.js) |
| TC-INT-105 | Protect mounted routes from missing credentials | Parameterized requests omit credentials across mounted course, roster, team, evaluation-management, report/export, logout, settings, and AI route families. | Each tested request returns 401 before exposing protected data or changing database/inbox state. These are boundary checks, not functional AI or migration approval. | REG-CW01-04 | [`authenticationAccess.test.js`](../../../../../src/backend/tests/integration/authenticationAccess.test.js) |
| TC-INT-106 | Accept a valid manually signed JWT | Sign an unexpired professor JWT with the configured test secret; GET the owned course. | HTTP 200 and the owned course is returned. | — | [`authenticationAccess.test.js`](../../../../../src/backend/tests/integration/authenticationAccess.test.js) |
| TC-INT-107 | Keep a login token usable after logout | Login; access an owned course; call logout; reuse the same login-issued token. | The token remains accepted after logout; this documents the current absence of server-side JWT revocation. | — | [`authenticationAccess.test.js`](../../../../../src/backend/tests/integration/authenticationAccess.test.js) |
| TC-INT-108 | Reject professor JWT on student evaluation-link routes | Use a valid professor JWT as the path token for student form, status, and submission requests; compare state and inbox. | Each request returns 404 and no database or inbox state changes. | — | [`authenticationAccess.test.js`](../../../../../src/backend/tests/integration/authenticationAccess.test.js) |
| TC-INT-109 | Reject student link token as professor Bearer credential | Use a public student evaluation-link token as Bearer authorization for a protected professor request. | Professor authentication is denied; database and inbox state remain unchanged. | — | [`authenticationAccess.test.js`](../../../../../src/backend/tests/integration/authenticationAccess.test.js) |
| TC-INT-110 | Allow owners to list and access their own resources | With two professors and separate courses, list each professor's courses; read and update each owned course, then read its roster and teams. | Each list contains only its owner's course; owned course reads and updates succeed, and roster/team reads return the expected contents. | — | [`authorization.test.js`](../../../../../src/backend/tests/integration/authorization.test.js) |
| TC-INT-111 | Ignore protected course and team fields on updates | Update an owned course with submitted foreign owner/identity and MongoDB operator fields; update an owned team with foreign course, roster, and count fields. | Supported names update; owner, IDs, course relationship, membership, and count remain server-controlled. | REG-CW02-05 | [`authorization.test.js`](../../../../../src/backend/tests/integration/authorization.test.js) |
| TC-INT-112 | Preserve protected student fields on update | Update a student with foreign course/team IDs, attacker token, completion flag, and MongoDB operator fields. | Supported name changes; identity, course/team relationship, capability token, and completion state remain unchanged. | — | [`authorization.test.js`](../../../../../src/backend/tests/integration/authorization.test.js) |
| TC-INT-113 | Ignore protected team fields on creation | Create a team while submitting a foreign course, chosen team ID, roster, and counter. | Team is created under the authenticated professor's course with server-controlled identity, membership, and count; foreign records remain unchanged. | — | [`authorization.test.js`](../../../../../src/backend/tests/integration/authorization.test.js) |
| TC-INT-114 | Derive new course owner from authenticated professor | Create a course while submitting another professor's owner ID. | Course is created for the authenticated professor; submitted owner does not transfer ownership. | REG-CW02-05 | [`authorization.test.js`](../../../../../src/backend/tests/integration/authorization.test.js) |
| TC-INT-115 | Ignore submitted course, team, and student identities | Submit another record's `_id` in update bodies for an owned course, team, and student; compare database snapshots. | Each update succeeds without changing the selected record's identity or any database record. | REG-CW02-05 | [`authorization.test.js`](../../../../../src/backend/tests/integration/authorization.test.js) |
| TC-INT-116 | Deny access to another professor's course | Attempt foreign course read, update, and deactivate operations with the first professor's token; inspect records. | Requests return 404 without disclosing or changing foreign course state. | REG-CW01-05, REG-CW02-04 | [`authorization.test.js`](../../../../../src/backend/tests/integration/authorization.test.js) |
| TC-INT-117 | Deny another professor's roster access | Attempt protected roster operations against the other professor's course and students. | Requests return 404 and no records change. | REG-CW03-05 | [`authorization.test.js`](../../../../../src/backend/tests/integration/authorization.test.js) |
| TC-INT-118 | Deny another professor's report and export access | Attempt report and export requests for a foreign course. | Requests are denied without foreign report data or database changes. | REG-CW09-03 | [`authorization.test.js`](../../../../../src/backend/tests/integration/authorization.test.js) |
| TC-INT-119 | Deny another professor's evaluation-management operations | Attempt foreign-course invitation, status, and reset operations; inspect records and Mailpit. | Requests return 404; no database changes or invitation messages occur. | REG-CW05-06 | [`authorization.test.js`](../../../../../src/backend/tests/integration/authorization.test.js) |
| TC-INT-120 | Deny another professor's team operations | Attempt team operations using foreign course/team identifiers. | Requests return 404 without foreign disclosure or mutation. | — | [`authorization.test.js`](../../../../../src/backend/tests/integration/authorization.test.js) |
| TC-INT-121 | Deny foreign child IDs under an owned course | Use child resource IDs belonging to the other professor's course beneath an owned course path. | Requests return 404 and all application collections and reports remain unchanged. | — | [`authorization.test.js`](../../../../../src/backend/tests/integration/authorization.test.js) |
| TC-INT-122 | Reject a student submitting to self | Submit an evaluation-link response addressed to the capability holder; inspect stored evaluations. | HTTP 400; no evaluation writes or completion-state change. | REG-CW08-02 | [`authorization.test.js`](../../../../../src/backend/tests/integration/authorization.test.js) |
| TC-INT-123 | Reject foreign, nonexistent, or ineligible recipients | Submit to a foreign-course student, a nonexistent student, and a nonteammate recipient; inspect state. | Each forbidden recipient is rejected without writes. | REG-CW08-03 | [`authorization.test.js`](../../../../../src/backend/tests/integration/authorization.test.js) |
| TC-INT-124 | Validate a whole recipient batch before writing | Submit a batch with an eligible peer followed by a forbidden recipient; inspect evaluations and student state. | The batch is rejected before any write, including the earlier valid recipient. | REG-CW08-03 | [`authorization.test.js`](../../../../../src/backend/tests/integration/authorization.test.js) |
| TC-INT-125 | Allow an eligible same-course peer without a team | Use a student capability token with no team and submit to an eligible same-course peer; inspect stored evaluation. | Submission succeeds and is stored with the capability holder's course/evaluator context. | — | [`authorization.test.js`](../../../../../src/backend/tests/integration/authorization.test.js) |
| TC-INT-126 | Invalidate a student token after authorized reset | Reset evaluation state for the token's course; retry form, status, and submission routes with its old token. | Each old-link request returns 404; reset state remains effective. | — | [`authorization.test.js`](../../../../../src/backend/tests/integration/authorization.test.js) |

## 5. Execution Instructions

Run focused access checks from the repository root:

```bash
npm run test:integration -- authentication.test.js authenticationAccess.test.js authorization.test.js
```

Run the complete service-backed suite to check compatibility with other integration workflows:

```bash
npm run test:integration
```

Review runner output and `result.json` under ignored `test-results/integration/<run-id>/` for completion and cleanup. A local pass alone does not establish CI enforcement.

## 6. Test Results

The October 31, 2026 full integration run passed 200 tests across 15 files at revision `d0088f7`; the runner exited successfully and verified cleanup. The run summary is recorded in the [integration test results at commit dd7d26d](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/blob/dd7d26d1aa3b4431b6cd477271e19ca8f792435f/docs/Team-P25-02/modernization/implementation/testing/integration-testing.md#test-results). The integration suite includes these authentication and authorization test files.

The test sources and assertions are **implemented**. This dated full-suite result is local **verified** evidence for that revision. It does not establish that every case is selected or CI-enforced on every change. No new test run was performed for this documentation rewrite.

## 7. Limitations and Remaining Coverage

- Logout is client-side and does not revoke an issued JWT. Tests do not promise immediate revocation after account deletion or password changes.
- MFA, refresh tokens, exhaustive permissions beyond the finite protected route set, token entropy/uniqueness, and browser login or student-link navigation are not established here.
- Mailpit captures invitation messages but does not establish external email delivery. Browser behavior is documented separately in the [end-to-end testing record](end-to-end-testing.md).
- Legacy migration and automatic-assignment routes receive authentication-boundary checks, not functional approval.
- Account recovery remains a separate test scope.
- Recipient eligibility is checked before submission writes. Later rating/feedback validation, duplicate recipients, concurrent submissions, and database rollback are covered by the [submission-integrity cases and results](api-database-integration.md#5-submission-integrity).
