# Authentication and Authorization Integration Tests

## 1. Testing Strategy

These tests exercise actual Express routes, JWT verification, MongoDB records,
and the isolated Mailpit inbox. They supplement the existing login, student
evaluation, and API/database tests without mocking authentication middleware or
persistence. They implement the access boundaries in
[CW-01, CW-02, CW-06, CW-08, and CW-09](../../../requirements/workflows/04-critical-peers-workflows.md).

The two access models are professor accounts authenticated by login-issued JWTs,
and students authorized by individual evaluation-link tokens. There is no
implemented administrator/student JWT role hierarchy. Each case starts from
fresh synthetic data; authorization cases add a second independently logged-in
professor with a separate course, team, and students. Denied requests must return
the expected error without disclosing protected records or changing application
collections. Invitation denials must also leave the captured inbox empty.

Course resources return `404 NOT_FOUND` for both absent and other-professor
courses. Authentication failures return `401 UNAUTHORIZED`. Student submissions
with recipients outside the token holder's eligible peer set return
`400 VALIDATION_ERROR` before any evaluation is saved. Course and team updates
accept supported editable fields while preserving ownership and relationships.

Use the prerequisites and isolation safeguards in the
[integration environment guide](integration-test-environment.md). Docker must
already be running. From the repository root, run the focused access checks:

```bash
npm run test:integration -- authentication.test.js authenticationAccess.test.js authorization.test.js
```

Run all integration suites to check compatibility with authorized workflows:

```bash
npm run test:integration
```

The root runner supplies a fresh database/inbox and ephemeral JWT secret for
each run. The test container receives that same secret as `TEST_JWT_SECRET` to
construct deterministically expired credentials and an unexpired control;
wrong-signature credentials use a different synthetic key. No development
credentials or configuration are required. Do not print tokens or secrets.
Logs and cleanup outcomes remain under ignored
`test-results/integration/<run-id>/`. Run the complete command twice to verify
repeatability and inspect `result.json` for successful, verified cleanup.

## 2. Test Cases

The following purposes, steps, and expected outcomes were recorded before live
execution. Parameterized rows expand into individually named tests; the source
files contain the exact method/path and input combinations.

| Group | Purpose and steps | Expected result |
| --- | --- | --- |
| Persisted login | Use saved credentials; check identity and `last_login`, then access the protected course list. Try wrong password, unknown email, and missing credentials. | Valid login returns a usable JWT and updates only intended login state; rejected credentials return no identity/token and cause no stored changes. Existing `authentication.test.js` cases are reused. |
| Credential failures | Attempt a protected course read and a real course-name update with missing, empty, malformed, wrong-scheme, tampered, expired, and wrongly signed credentials. | Each returns 401 with no course disclosure, stored mutation, or inbox change. |
| Mounted-route protection | Omit credentials across every mounted protected route, including course, roster, team, evaluation-management, report/export, logout, professor settings, and AI endpoints. | Each returns 401 before its handler can return protected data or perform side effects. This checks access boundaries, not AI business behavior or migration correctness. |
| JWT controls and logout | Access an owned course using both a manually signed unexpired control and a real login token; log out and retry the login token. | Both valid controls succeed. Logout succeeds without stored mutations; the existing stateless JWT remains valid until expiration. Server-side token revocation is not claimed. |
| Credential separation | Send a stored student link token as professor Bearer authorization; use a professor JWT as a student URL token on form, status, and submission endpoints. | Neither credential substitutes for the other; requests are denied without mutation. |
| Professor isolation | Log in as both professors, list courses, read owned courses/rosters/teams, and edit owned course details. Attempt the other professor's course-scoped read/write operations, including roster upload, invitations, reset, and CSV export. | Own operations succeed; lists are isolated; every foreign-course request returns 404 with unchanged application/report collections and an empty inbox. |
| Child-resource isolation | Place foreign student/team identifiers under an owned course URL in roster edits, team edits/membership, and student/team reports. | 404; no foreign record disclosure or stored changes. |
| Protected fields | Submit ownership, identity, relationship, count, capability-token, completion, and MongoDB operator fields alongside legitimate course/team/student edits; try overriding ownership on course/team creation. | Legitimate edits persist; protected fields and foreign course/team/student records remain intact; new courses belong to the authenticated professor and new teams to the selected owned course. |
| Student recipients | Submit to self, a foreign-course student, a nonexistent student, a different team's student, or a valid peer followed by a forbidden recipient. Also submit as a teamless student to an eligible course peer. | Forbidden recipients return 400 without any writes; the teamless fallback permits the supported same-course peer submission. |
| Revoked student capability | Assign a link token, reset its course through the authorized API, then reuse the old token for form, status, and submission. | All three old-token requests return 404 and leave post-reset state unchanged. |

## 3. Results and Limits

Verification completed October 26, 2026 with Node 24.21.0, npm 11.19.0,
Docker Engine 29.9.2, and Compose 5.6.1. The two new files add 96 cases:
48 authentication-boundary cases and 48 resource/capability authorization cases.
The existing four persisted-login cases remain unchanged.

The [email integration record](email-integration.md) documents later full
integration runs including these authorization cases, as well as focused and
concurrent SMTP verification. The results predate this source/documentation
review; this update did not rerun tests.

| Command or experiment | Actual result |
| --- | --- |
| New authorization suite against an isolated copy of the original backend | 40 failed and 8 passed out of 48. This expected nonzero run exposed missing ownership/recipient checks, foreign-team report access, and unprotected request fields; cleanup was verified. |
| `npm run test:integration`, twice after the final source/test changes | Both fresh runs passed all 169 tests in 11 files: the original 73 plus 96 new cases. Both exited 0 and verified cleanup. |
| `npm --prefix src/backend test` | All 62 tests in 10 files passed; integration files remained excluded from this service-free suite. |
| `npm run lint` and `npm run format:check` | Passed with no lint diagnostics and all checked files formatted. |

The baseline failures were retained as normal assertions and pass with the
repairs; no access-control defect is hidden by an expected-failure or skipped
test. The full runs also verify that existing authorized API/database and
captured-email workflows continue to pass. These results do not establish a
new coverage percentage or a hosted CI integration job.

These checks do not establish browser login/navigation, real invitation-link
navigation, token entropy/uniqueness, MFA, refresh tokens, external email
delivery, or exhaustive resource permissions outside the covered routes. The legacy
migration and automatic-assignment endpoints receive authentication-boundary
checks, not functional approval. Existing account-recovery tests remain in the
full suite; account-support expansion is outside this test scope.

Recipient authorization is checked for the whole submission before saving.
General all-or-nothing behavior for later rating/feedback errors, duplicate
recipients, concurrent submissions, and database failures remains separate work.
JWT logout remains a client-side operation and does not revoke an issued token.
The current tests do not promise immediate revocation after account deletion or
password changes. See [Known Bugs](../../../known-bugs.md) for recorded defects.
