# Email Integration Testing Implementation

## Purpose and Scope

This record describes implementation and testing for course and team evaluation invitations sent through the configured SMTP service. The tests cover regression targets REG-CW07-01 through REG-CW07-04, with link-resolution support for REG-CW06-02, as mapped in the [regression matrix](../../../requirements/regression-test-matrix.md).

The backend integration tests exercise actual Express routes, MongoDB records, and SMTP captured by Mailpit. They verify invitation content and recipient selection, stored token links, SMTP rejection behavior, retry, and recorded SMTP acceptance. They do not establish external email delivery or browser navigation.

## Testing Environment and Tools

The tests use the isolated Docker environment described in the [integration test environment record](integration-test-environment.md). The root runner starts a disposable backend, MongoDB database, and Mailpit inbox with synthetic data. Each run has isolated resources and no published host ports or external SMTP forwarding.

Mailpit’s Chaos API injects deterministic SMTP 451 rejection at the sender or recipient stage. Rejection probability is set to 100% for the targeted test, then the original configuration is restored and verified in a `finally` block before retry. See the [pinned Mailpit Chaos API](https://github.com/axllent/mailpit/blob/v1.27.4/server/apiv1/chaos.go) and [Chaos configuration documentation](https://mailpit.axllent.org/docs/integration/chaos/).

## Test Organization

**Backend integration:** [`emailIntegration.test.js`](../../../../../src/backend/tests/integration/emailIntegration.test.js) tests invitation message content, context, SMTP rejection, retry, and acceptance state through the actual API and Mailpit. [`evaluationManagement.test.js`](../../../../../src/backend/tests/integration/evaluationManagement.test.js) supplies related checks for course/team selection, individualized tokens, recipient exclusion, and captured invitations.

**Frontend unit:** [`CourseManagement.test.jsx`](../../../../../src/frontend/tests/CourseManagement.test.jsx) covers how invitation status and acceptance information are presented, including legacy records with unknown acceptance. This is source-level test organization; the backend integration result below does not verify the frontend suite.

## Test Cases

The backend email suite has seven expanded cases: two content/context cases, four SMTP rejection-and-retry cases, and one failed-resend-after-acceptance case.

| Case group | Actions and expected outcome | Source |
| --- | --- | --- |
| Course invitation content and context | Send course invitations and inspect the captured messages, stored tokens, and API context returned for each token. Each message has the intended recipient and sender, no CC/BCC, expected subject and course details, and clickable and fallback hash-route links resolving to the correct evaluator, course, and eligible peers. Unrelated course records remain unchanged. | [`emailIntegration.test.js`](../../../../../src/backend/tests/integration/emailIntegration.test.js) |
| Team invitation content and context | Send to one selected team while another same-course team and a foreign course exist. Only the selected student receives an invitation; unselected and foreign-course students and records remain unchanged. | [`emailIntegration.test.js`](../../../../../src/backend/tests/integration/emailIntegration.test.js) |
| Course/team sender-stage rejection | For both course and team sends, configure 100% sender-stage 451 rejection. The endpoint returns HTTP 502 with truthful failed-recipient details; no failed message or SMTP acceptance is recorded. The retained token is reused on retry, which succeeds and records acceptance. | [`emailIntegration.test.js`](../../../../../src/backend/tests/integration/emailIntegration.test.js) |
| Course/team recipient-stage rejection | Repeat the course and team scenarios with 100% recipient-stage 451 rejection. Failure and retry outcomes match the sender-stage cases. | [`emailIntegration.test.js`](../../../../../src/backend/tests/integration/emailIntegration.test.js) |
| Failed resend after prior acceptance | First send successfully, then reject a resend. The resend returns HTTP 502; prior tokens, acceptance timestamps, status, and captured messages remain unchanged. | [`emailIntegration.test.js`](../../../../../src/backend/tests/integration/emailIntegration.test.js) |

Successful invitation requests return HTTP 200. The `invitation_accepted_at`
timestamp is recorded only after SMTP acceptance and while the emailed token is
still current. A rejected send leaves its generated token available for retry;
token existence alone does not mark invitations as sent. Roster replacement and
evaluation reset clear acceptance with the old token. Existing tokens without a
recorded acceptance are not assigned guessed delivery history.

## Execution Instructions

Run from the repository root with Docker and Compose available:

```bash
npm run test:integration -- emailIntegration.test.js evaluationManagement.test.js
npm run test:integration
```

The first command runs the focused invitation suites within the isolated environment lifecycle. The second runs the complete integration suite. The root command creates a fresh run and retains logs and cleanup results under ignored `test-results/integration/<run-id>/`.

For a service-backed run, check the runner output and `result.json` for test completion and cleanup. A dated result tied to a known source revision is **verified** evidence. A local pass alone does not establish that every case is **CI-enforced**.

## Verification Results

The October 31, 2026 full integration run passed 200 tests across 15 files at revision `d0088f7`; the runner exited successfully and verified cleanup. The email integration suite is part of the integration suite. The run summary is recorded in the [integration test results at commit dd7d26d](https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/blob/dd7d26d1aa3b4431b6cd477271e19ca8f792435f/docs/Team-P25-02/modernization/implementation/testing/integration-testing.md#test-results).

The integration test source and SMTP assertions are **implemented**. The cited run provides dated local **verification** of the full backend integration suite, including this email suite. The run does not establish that every email case is separately selected or **CI-enforced** on every change.

## Limitations and Remaining Work

- SMTP acceptance means the configured SMTP server accepted the message. It does not prove external delivery, inbox placement, or that a student read it.
- Browser navigation is documented separately in the [end-to-end testing record](end-to-end-testing.md).
- The SMTP rejection cases deterministically reject all targeted sends during each injected outage. They do not test mixed recipient outcomes, provider timeouts, or authenticated staging SMTP.
- Standalone reminders and account recovery are outside this record’s invitation scope.
- Frontend status presentation has separate unit tests; the cited integration run does not report their execution.
