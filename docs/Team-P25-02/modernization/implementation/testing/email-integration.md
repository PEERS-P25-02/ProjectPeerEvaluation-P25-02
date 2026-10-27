# Evaluation Invitation Email Integration

## 1. Testing Strategy

These checks follow the invitation targets REG-CW07-01 through REG-CW07-04
in the [regression matrix](../../../requirements/regression-test-matrix.md),
with supporting checks for REG-CW06-02. They use actual HTTP requests through
Express, persisted synthetic students/tokens in MongoDB, and real SMTP captured
by the isolated Mailpit service. Email sending is not mocked.

The existing [evaluation-management cases](../../../../../src/backend/tests/integration/evaluationManagement.test.js)
already assert course/team selection, individualized tokens, excluded recipients,
and captured invitations. The [email integration suite](../../../../../src/backend/tests/integration/emailIntegration.test.js)
adds message content, link/context checks, deterministic SMTP rejection, retry,
and acceptance-state verification. Standalone reminders and account recovery
remain outside the matrix target; their existing tests must still pass.

Use the prerequisites in the [integration environment guide](integration-test-environment.md).
Docker must already be running. From the repository root:

```bash
npm run test:integration -- emailIntegration.test.js evaluationManagement.test.js
npm run test:integration
```

The standalone test Compose project starts Mailpit with
`MP_ENABLE_CHAOS=true`; all rejection probabilities initially remain zero.
The tests save `/api/v1/chaos`, PUT a sender or recipient trigger with SMTP
code 451 and probability 100, check the configuration, and restore/read it back
in `finally` before retrying. This exercises real rejection at `MAIL FROM` or
`RCPT TO` without restarting services or injecting random failures. The mechanism
is supported by the [pinned Mailpit API](https://github.com/axllent/mailpit/blob/v1.27.4/server/apiv1/chaos.go)
and [Chaos configuration](https://mailpit.axllent.org/docs/integration/chaos/).

Each invocation owns a database, inbox, internal network, and ephemeral settings;
no host ports or external SMTP forwarding/relay are enabled. Fixtures use
invented addresses only. Concurrent root invocations must remain independent,
including when one run rejects SMTP while another sends successfully.
The runner retains logs and cleanup results in ignored
`test-results/integration/<run-id>/` and removes only that run's resources.

## 2. Test Cases

These purposes, actions, and expected results were recorded before execution.
The new file contains seven cases; parameterized SMTP failures expand to four
individually named cases.

| Case | Purpose and steps | Expected result |
| --- | --- | --- |
| Course invitation content/context | Send to Course A; inspect both captured messages, persisted tokens, and the form returned for each emailed token. | Exact intended recipient/sender, no CC/BCC, correct subject/greeting/course/deadline, matching clickable and fallback hash-route URLs, and the correct evaluator/course/eligible peers. Course B remains unchanged. |
| Team invitation content/context | Place another Course A student on an unselected team; send only to the selected team and inspect the message/context. | Only the selected student receives the personalized invitation; unselected and foreign-course students are excluded and unchanged. |
| Course/team sender rejection | Configure 100% sender-stage 451 rejection, attempt invitations, inspect response, stored state, status, and inbox; restore SMTP and retry. | HTTP 502 with truthful failed counts and no captured failed message or acceptance marker; status does not claim sent. Retry succeeds with the retained tokens, captured messages, and recorded SMTP acceptance. |
| Course/team recipient rejection | Repeat at the recipient stage rather than sender stage. | The same failure/recovery invariants hold for real recipient rejection. |
| Failed resend after prior acceptance | Send successfully, retain accepted timestamps/tokens and captured messages, then reject a resend. | HTTP 502 truthfully reports this attempt's failures; previous acceptance/tokens remain unchanged and the inbox contains only the original messages. |

Existing fixture tests additionally distinguish a legacy token from recorded
SMTP acceptance and verify that roster replacement and evaluation reset clear
acceptance along with the token while preserving unrelated-course state.

## 3. Results and Limits

Verification completed October 26, 2026 using Node 24.21.0, npm 11.19.0,
Docker Engine 29.9.2, and Compose 5.6.1. The seven new cases extend the
existing 169-case integration suite; existing tests remain required to pass.

| Command or experiment | Actual result |
| --- | --- |
| `npm run test:integration`, twice after the final application/integration-test changes | Both runs passed 176 tests in 12 files, exited 0, and verified cleanup. |
| Concurrent `npm run test:integration` and `npm run test:integration -- emailIntegration.test.js` | The full 176-case run and the focused seven-case run both passed in distinct projects/databases/inboxes, with cleanup verified independently. |
| New email suite against an isolated copy of the original backend, with Chaos enabled | All seven cases failed as expected: two missing hash-route links, four false HTTP-success responses under real SMTP rejection, and missing recorded acceptance. The command exited nonzero and verified cleanup. |
| `npm --prefix src/backend test` | All 64 tests in 10 files passed, including the token-matched acceptance-update guards. |
| `npm test` and `npm run build` | All 63 frontend tests passed and the production build succeeded; the existing large-chunk warning remains. The status heading now says "No Sent Invitations Recorded" so legacy unknown acceptance is not presented as proof that a message was never sent. |
| `npm run lint` and `npm run format:check` | Passed. |

The original assertions remain active with the repairs; no defect is hidden
with a skipped or expected-failure test. This is local service-backed evidence,
not a new coverage percentage or proof of a hosted CI integration job.

`invitation_accepted_at` records successful acceptance by the configured SMTP
service, not external delivery or whether a student read the email. It is set
only after SMTP success and only while the emailed token is still current.
Generated tokens remain available for retry after rejection; their existence
alone does not set `evaluations_sent`. A previous acceptance survives a failed
resend. Reset/import clear acceptance with the old tokens. Existing tokens
without a recorded acceptance are not backfilled with guessed delivery history;
they remain valid access credentials and a successful resend records acceptance.

Both invitation endpoints return HTTP 502 when any intended send fails, with
the accepted count and failed-recipient details retained in the response.
Full success retains HTTP 200. The integration suite deterministically rejects
every targeted send during each injected outage; it does not claim mixed
recipient rejection from a probabilistic trigger.

Invitation URLs use the configured frontend origin/path and a
`#/evaluate/<token>` fragment matching HashRouter. The suite inspects the URL and
resolves its token through the real API; it does not open a browser. Actual
navigation remains REG-CW06-01 browser E2E work. External delivery, authenticated
staging SMTP, provider outages/timeouts, reminder/reset-email expansion, and the
known password-reset defects remain separate verification concerns. See
[Known Bugs](../../../known-bugs.md) and the temporary
[coverage gap record](regression-coverage-gaps.md).
