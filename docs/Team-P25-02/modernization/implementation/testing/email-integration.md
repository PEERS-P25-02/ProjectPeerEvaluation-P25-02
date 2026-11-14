# Email Integration Testing Implementation

## 1. Overview

This record documents backend integration checks for course and selected-team evaluation invitations, evaluation reminders, and account password-reset email. The invitation cases address [REG-CW07-01 through REG-CW07-04 and REG-CW06-02](../../../requirements/regression-test-matrix.md); the reminder and reset cases are supporting email checks. API/database state changes remain documented in the [API and database integration record](api-database-integration.md).

Mailpit capture verifies message content and SMTP acceptance by the configured test server. SMTP acceptance does not establish external delivery, inbox placement, or that a recipient read the message. Token resolution is checked through the API, not a browser.

## 2. Testing Strategy

The [isolated integration environment](integration-test-environment.md) starts a disposable backend, MongoDB database, and Mailpit inbox for each run. Tests use synthetic accounts and recipients, real HTTP routes, persisted records, and captured SMTP messages. The test sink does not forward mail or publish host ports.

The invitation suite uses Mailpit's [Chaos API](https://github.com/axllent/mailpit/blob/v1.27.4/server/apiv1/chaos.go) to inject deterministic SMTP 451 rejection with 100% probability at either the sender or recipient stage. Each case restores and verifies the original [Chaos configuration](https://mailpit.axllent.org/docs/integration/chaos/) in a `finally` block before retry. Successful sends record `invitation_accepted_at` only after SMTP acceptance while the emailed token is current. Rejected sends retain generated tokens for retry without marking them accepted.

## 3. Test Organization

| Test file | Email assertions documented here |
| --- | --- |
| [`emailIntegration.test.js`](../../../../../src/backend/tests/integration/emailIntegration.test.js) | Course and selected-team invitation recipients, content, token links, SMTP rejection, retry, and acceptance state. |
| [`evaluationManagement.test.js`](../../../../../src/backend/tests/integration/evaluationManagement.test.js) | Reminder recipients, subject and token link where asserted, and exclusion of completed or unselected students. |
| [`accountSupport.test.js`](../../../../../src/backend/tests/integration/accountSupport.test.js) | Password-reset recipient, subject, and link matching the stored reset token. |

The supporting files also test API/database behavior. This record assigns IDs only to their email assertions.

<a name="test-cases"></a>

## 4. Test Cases

TC-INT-200 through TC-INT-206 map to the seven scenarios expanded by the dedicated email suite. TC-INT-207 through TC-INT-209 identify existing assertions in the two supporting suites. A dash means the case has no direct regression-matrix target; it does not imply missing assertions.

| Test Case | Objective | Steps | Expected Result | Regression Target | Source |
| --- | --- | --- | --- | --- | --- |
| TC-INT-200 | Verify course invitation recipients, content, and links | Send course invitations; inspect each Mailpit message, stored token, token API context, and foreign-course state. | HTTP 200; one personalized message per eligible student with the expected sender, subject, course details, no CC/BCC, and clickable/fallback links using that student's stored token. Each token resolves to its own evaluator, course, and eligible peers; foreign-course records remain unchanged. | REG-CW07-01, REG-CW07-02, REG-CW07-04, REG-CW06-02 | [`emailIntegration.test.js`](../../../../../src/backend/tests/integration/emailIntegration.test.js) |
| TC-INT-201 | Verify selected-team invitations | Send invitations to one team; inspect the captured message, selected token context, and unrelated records. | HTTP 200; only the selected student receives a personalized link resolving to that student. Unselected same-course and foreign-course students receive no message; foreign-course records remain unchanged. | REG-CW07-01, REG-CW07-02, REG-CW07-04 | [`emailIntegration.test.js`](../../../../../src/backend/tests/integration/emailIntegration.test.js) |
| TC-INT-202 | Recover from course sender-stage rejection | Set sender-stage 451 rejection; send course invitations; restore Chaos; inspect failure state and retry. | HTTP 502 reports every targeted recipient failed; inbox empty, acceptance timestamps absent, and status unsent. Retry succeeds with the persisted tokens, captured messages, acceptance timestamps, and status sent. | REG-CW07-03 | [`emailIntegration.test.js`](../../../../../src/backend/tests/integration/emailIntegration.test.js) |
| TC-INT-203 | Recover from course recipient-stage rejection | Repeat the course invitation failure and retry with recipient-stage 451 rejection. | HTTP 502 truthfully reports all failures without captured messages or acceptance; restored-service retry reuses tokens and records accepted messages and sent status. | REG-CW07-03 | [`emailIntegration.test.js`](../../../../../src/backend/tests/integration/emailIntegration.test.js) |
| TC-INT-204 | Recover from team sender-stage rejection | Set sender-stage 451 rejection for a selected-team invitation; restore Chaos; inspect failure state and retry. | HTTP 502 reports the selected recipient failed; no message or acceptance is recorded, and status is unsent. Retry reuses the token and records the selected message, acceptance, and sent status. | REG-CW07-03 | [`emailIntegration.test.js`](../../../../../src/backend/tests/integration/emailIntegration.test.js) |
| TC-INT-205 | Recover from team recipient-stage rejection | Repeat the selected-team failure and retry with recipient-stage 451 rejection. | HTTP 502 reports the selected recipient failed without captured mail or acceptance; retry reuses the token and records the selected accepted message and sent status. | REG-CW07-03 | [`emailIntegration.test.js`](../../../../../src/backend/tests/integration/emailIntegration.test.js) |
| TC-INT-206 | Preserve prior acceptance after a failed resend | Send course invitations successfully; force sender-stage 451 rejection on a resend; restore Chaos and compare state and inbox. | Resend returns HTTP 502 with zero new accepted messages; original tokens, acceptance timestamps, sent status, stored records, and captured messages remain unchanged. | REG-CW07-03 | [`emailIntegration.test.js`](../../../../../src/backend/tests/integration/emailIntegration.test.js) |
| TC-INT-207 | Verify pending-student reminder email | Seed accepted tokens and one completed evaluation; request course reminders; inspect Mailpit and database snapshot. | HTTP 200 reports one reminder; its sole recipient is the pending student, its subject names the course, its HTML contains that student's fixture token link, and stored state is unchanged. | — | [`evaluationManagement.test.js`](../../../../../src/backend/tests/integration/evaluationManagement.test.js) |
| TC-INT-208 | Exclude completed and unselected reminder recipients | Request reminders for one completed and one pending selected student while another pending student is unselected; inspect Mailpit and state. | HTTP 200 reports one reminder; only the selected pending student receives a message containing the fixture token link. Stored state is unchanged. | — | [`evaluationManagement.test.js`](../../../../../src/backend/tests/integration/evaluationManagement.test.js) |
| TC-INT-209 | Match password-reset email to stored token | Request a reset for a synthetic professor; inspect the captured message and stored reset token. | One message goes to the requested account with subject `Password Reset Request` and a link containing that account's stored reset token, not another professor's token. | — | [`accountSupport.test.js`](../../../../../src/backend/tests/integration/accountSupport.test.js) |

Roster replacement and evaluation reset clear acceptance with the old invitation token. Existing tokens without recorded acceptance are not assigned guessed delivery history; those state transitions belong to the [API/database cases](api-database-integration.md#test-cases).

## 5. Execution Instructions

Run from the repository root with supported Node.js and npm, Docker, and Docker Compose available:

```bash
npm run test:integration -- emailIntegration.test.js evaluationManagement.test.js accountSupport.test.js
npm run test:integration
```

The first command runs every test in the three selected integration files, including tests outside the email assertions documented here; the second runs the complete integration suite. Each invocation creates a fresh isolated run. Inspect runner output and ignored `test-results/integration/<run-id>/result.json` for test completion and verified cleanup.

## 6. Test Results

The historical October 31, 2026 full integration run at revision `d0088f7` passed 200 tests across 15 files, exited successfully, and verified cleanup. It included the three files listed above; it was a combined-suite result, not a separate email-only execution. The original result is recorded in the [integration test results at commit `dd7d26d`](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/blob/dd7d26d1aa3b4431b6cd477271e19ca8f792435f/docs/Team-P25-02/modernization/implementation/testing/integration-testing.md#test-results).

On November 13, 2026, the `fix/staging-invitations-teams` worktree rebased onto `dc5f32e` passed `npm run test:integration -- src/backend/tests/integration/emailIntegration.test.js src/backend/tests/integration/authorization.test.js`: 55 tests in two files (seven invitation and 48 authorization), exit 0, isolated project cleanup verified. The test backend explicitly uses a zero invitation interval with Mailpit; backend unit tests separately verify the ten-second default using fake timers. This local pass does not establish Mailtrap Free acceptance, Render behavior, or CI enforcement.

## 7. Limitations and Remaining Coverage

- [REG-CW05-09](../../../requirements/regression-test-matrix.md) remains **Partial**. Existing status assertions cover per-student state and totals, while invitation tests cover all-success or 100% rejection. No test sends to multiple intended recipients with only some SMTP-accepted, then checks each recipient's status and the documented aggregate outcome. No passing TC-INT case is assigned to that gap.
- Mailpit acceptance does not prove external provider delivery, inbox placement, or a recipient opening the message. Browser navigation is covered separately in the [end-to-end testing record](end-to-end-testing.md).
- These integration cases do not exercise SMTP timeouts, authenticated staging SMTP, or failure/retry behavior for reminders and password-reset mail.
- Frontend invitation-status presentation has separate unit tests; the cited combined backend run does not report their execution.
