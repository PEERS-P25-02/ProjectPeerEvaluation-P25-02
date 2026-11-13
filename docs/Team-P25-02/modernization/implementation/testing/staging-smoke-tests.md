# Staging smoke tests

## Scope and implementation

The separate `playwright.staging.config.cjs` runs three post-deployment checks after `deploy-staging` reports success for both exact live image digests:

- `TC-SS-01`: backend `/api/health` returns HTTP 200 and `status: OK`, which the endpoint reports only while MongoDB is connected.
- `TC-SS-02`: the deployed frontend renders the professor login page and rejects synthetic nonexistent credentials with HTTP 401 and `AUTH_ERROR` from the configured backend.
- `TC-SS-03`: the evaluation deep link loads the pre-seeded course, teammate, rubric, and a visible enabled rating control without selecting or submitting anything.

The requester reports existing Render service checks for backend `/api/health` and frontend `/`; those external settings were not inspected here. The new backend check repeats health after both digests are live, while the login check itself loads frontend `/`. There is no separate frontend-root test.

The deploy job checks the smoke token's presence and format before any Render deploy request. It does not query the existing backend for fixture readiness because the pre-change request logger would record the token in the URL.

The staging config requires exact HTTPS origins (`https://projectpeerevaluation-p25-02-frontend.onrender.com` and `https://peers-staging-backend.onrender.com`) and a protected token value. Any unexpected origin fails closed before requests. It has no global setup and cannot reuse the disposable Compose setup. Traces, screenshots, and video are disabled. The CD workflow masks the fixture token and does not upload Playwright console output or browser artifacts. Its bounded JSON evidence records source SHA, both image digest references, overall smoke outcome, and sanitized per-check title/status/duration; failure records include a stable category and bounded diagnostic with token forms and URLs redacted. The run summary contains no test errors or URLs. `record-staging-success` depends on successful smoke validation, including evidence upload; a failure leaves the previous baseline unchanged. The existing baseline initially reflects the earlier deployment-and-health-only rule; the first successful run under this workflow establishes a smoke-validated baseline. Runs skipped by the selective deployment decision skip smoke validation as well.

The evidence writer requires exactly one passing result for each of the three named checks, as well as a successful Playwright step and valid SHA/digests. Missing, duplicate, skipped, interrupted, timed-out, or failed results make the validation job fail before the baseline job can run.

The backend request logger now redacts `/api/evaluate/<token>` path segments. The route and response behavior are unchanged. Platform-level access/request logging may still capture request paths outside the application logger; that retention behavior was not inspectable from this repository and requires confirmation in the staging host configuration before fixture provisioning.

On 2026-11-13, the requester confirmed that this staging workspace has no HTTP request logs. [Render's logging documentation](https://render.com/docs/logging) says Pro and higher workspaces can retain requested URLs. Recheck the workspace log behavior if its plan or configuration changes.

## Fixture and operation

Provision a dedicated synthetic course named `Staging Smoke Course`, evaluator/student, and teammate named `Staging Smoke Teammate` as a separate staging database operation. The evaluator must have an active, unsubmitted evaluation token and share a team with the teammate. Reuse this fixture across deployments; do not let smoke tests create, update, submit, or delete it. Store its token as GitHub Actions secret `STAGING_EVALUATION_TOKEN`. The test accepts token characters `[A-Za-z0-9_-]`, length 12–256. Rotate/restore the fixture through a separately authorized operation if it is submitted, expired, or changed.

### Manual fixture recovery or token rotation

1. Obtain maintainer authorization for the specific staging-only change, wait for any in-flight CD run to finish, and avoid new CD merges/reruns during the operation. Confirm the staging database and exact synthetic course, student, and teammate records before editing; leave all other records alone.
2. Restore the dedicated fixture's course/team links and unsubmitted evaluation state if needed. Review any existing evaluation and status fields for that synthetic student before changing them; do not reset or delete real or unrelated records.
3. Generate a new URL-safe token of the accepted length, replace only that student's `evaluation_token` in staging MongoDB to revoke the old link, and update the GitHub Actions `STAGING_EVALUATION_TOKEN` secret. Never place either token in source, shell history, chat, or retained notes.
4. Run the three staging checks in an authorized environment, confirm the evaluation remains unsubmitted, and record the operator, time, affected synthetic record IDs, and pass/fail result without recording the token. Resume CD only after the fixture and secret agree.

For an explicitly authorized manual run, set the exact origins and token in the environment without putting the token in shell history, then run:

```bash
npm run test:staging
```

The config rejects absent or unexpected origins before starting the browser. `npm run test:staging:guard` runs local checks for the guard without making network requests.

## Validation evidence and limits

The workflow summary and `staging-smoke-<sha>-<run>-<attempt>` artifact tie the smoke result to the source and both immutable image digests. Application test logs are GitHub-masked and are not uploaded as artifacts. Failed checks fail the validation job and gate baseline advancement. Rollback/restoration remains issue #169.

Local validation can exercise the origin guard, evidence formatting, and token-redaction helper, but cannot prove the protected fixture exists or that hosted smoke checks pass. Do not claim hosted acceptance until an eligible post-merge CD run records all three checks passing against the live digests. No staging fixture was provisioned and no staging network call was made for this implementation.
