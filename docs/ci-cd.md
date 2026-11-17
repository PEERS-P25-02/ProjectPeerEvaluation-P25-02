# CI and delivery

This guide describes the current GitHub Actions verification pipeline and the
local commands that reproduce its main checks. CI verifies candidates; the
separate [continuous-delivery workflow](../.github/workflows/cd.yml)
receives completed CI runs for `main`. Its delivery job is eligible only for a
successful push run from this repository; it also checks the candidate against
the current `main` tip and requires a two-parent merge commit. PR and merge-group
runs do not initiate delivery work.

## CI events and required work

`.github/workflows/ci.yml` runs on pushes to `main`, pull requests targeting
`main`, and merge-queue `merge_group` candidates targeting `main`. It has no
path filters: documentation-only changes run the same applicable checks. Each
run checks the immutable candidate SHA supplied by its event. Concurrency is
keyed by event and candidate, and a newer run for the same key cancels its
predecessor.

For a pull request, inspect the checks on its head before adding it to the merge
queue. The merge-group run verifies the queued candidate, including earlier
queued changes; a separate push run verifies the landed `main` commit. In
GitHub, open the PR's **Checks** tab or the repository's **Actions** tab, select
the CI run for the candidate SHA, then open individual jobs, logs, summaries,
and artifacts. Repository settings determine whether the queue and gate are
required for merging.

All three event types run CI policy tests, the frontend production build,
frontend/backend lint and formatting checks, complete frontend and backend unit
suites, complete API integration tests, Dependency-Check, Gitleaks, and the
final `CI Gate`. The gate requires every applicable job to succeed and accepts
only the documented event-specific skips:

Build, quality, security, policy, unit, integration, and applicable browser jobs
run independently. The applicable coverage job waits for successful unit and
integration jobs; `CI Gate` waits for all jobs and checks their outcomes, even
when a dependency fails. Unexpected failures, cancellations, and skips fail the
gate.

| Check | Pull request | Merge group or main push |
| --- | --- | --- |
| Browser E2E | Skipped | Required |
| Changed-Line Coverage | Required | Skipped |
| Overall Line Coverage | Skipped | Required |

PR changed-line coverage combines frontend and backend unit coverage with
backend runtime coverage from the complete API integration suite. It requires
at least 80% of changed executable lines to be covered. A change with no
executable lines is reported as not applicable; missing, invalid, or
mismatched coverage evidence fails. Main pushes and merge-group candidates
require at least 70% overall line coverage independently for frontend and
backend. Browser E2E does not contribute coverage. Thresholds and production
source scope are defined in [`scripts/coverage/policy.json`](../scripts/coverage/policy.json).
The [quality gate policy](requirements/quality-gates.md)
defines the requirements and their wider context.

The final check name is `CI Gate`. Workflow configuration shows what jobs it
evaluates; repository ruleset or branch-protection settings determine whether
GitHub requires it for merging.

## Security checks

OWASP Dependency-Check 13.0.0 scans both npm lockfiles, including development
dependencies, and fails for reported CVSS scores of 7 or higher, scanner errors,
or missing or invalid reports. It requires a
successfully updated vulnerability database no older than 48 hours. CI restores
the shared database cache and does not update it. The scheduled/manual updater
in `.github/workflows/security.yml` runs on the repository default branch,
requires the `NVD_API_KEY` Actions secret, and saves the database cache only
after a successful update and validation. Dependency-Check HTML and JSON
reports are uploaded as `owasp-dependency-check-report`.

Gitleaks scans the commits introduced by the event: PR base to head, merge base
to merge-group head, or push before to after. New-branch pushes compare against
the default branch. Its scan uses the full Git history and fails when event
commits cannot be verified or retrieved.
Findings and scanner errors fail the job; event-range scanning does not certify
all repository history.

## Reproduce checks locally

Use Node.js 24 for parity with CI and install both lockfile-defined dependency
sets from the repository root:

```bash
npm ci
npm ci --prefix src/backend
npm run build
npm run lint
npm run format:check
node --test scripts/ciGate.test.cjs scripts/regressionChanges.test.cjs scripts/integrationTestPaths.test.cjs scripts/coverage/coverage.test.cjs scripts/overallCoverage.test.cjs scripts/runCiCoverage.test.cjs scripts/deployStaging.test.cjs scripts/stagingHistory.test.cjs scripts/stagingCoordination.test.cjs scripts/stagingRollback.test.cjs
PEERS_COVERAGE=1 npm test
npm --prefix src/backend run test:coverage
PEERS_COVERAGE=1 npm run test:integration
npm run test:e2e
```

Integration and E2E runners require Docker and Docker Compose. They create
isolated disposable stacks, use synthetic test data, retain run-specific logs
and result files under `test-results/`, and remove and verify cleanup of their
own resources. E2E is a full browser suite. Staging smoke checks are separate
from normal CI; see [testing guidance](testing.md) for their prerequisites and
commands.

The local commands run the suites, but do not reproduce the hosted coverage
aggregation, artifact provenance validation, numerical coverage gates, or
security scans. `npm run test:coverage` and the backend coverage command produce
local unit reports only; they do not include API integration runtime coverage.
The CI frontend unit job uses `PEERS_COVERAGE=1 npm test` to produce canonical
coverage input. The integration runner uses `PEERS_COVERAGE=1` to capture
backend runtime coverage before stack cleanup.

## Artifacts and troubleshooting

Unit and integration jobs upload artifacts named with the candidate SHA, run
ID, and attempt. Their provenance records the suite, SHA, run ID, and attempt;
coverage consumers also validate producer artifact IDs and metadata. E2E
uploads its run results. PR coverage uploads the changed-line report; main
pushes and merge groups upload combined overall coverage reports. Dependency
report artifacts are described in the security section above.

Download the applicable coverage artifact and open its per-package HTML reports
to inspect uncovered lines; LCOV, JSON, and summaries provide machine-readable
results for lines, statements, functions, and branches. The PR patch report
identifies changed executable and missed lines. Unvisited production files
count as zero coverage; line hits alone do not establish functional correctness.
Artifacts are subject to the repository's GitHub Actions retention settings.
Uploads run even after failures where possible, so an artifact may be incomplete;
check the job outcome and provenance before treating it as evidence. A partial
rerun can use successful producer artifacts from an earlier attempt.

When a job fails, inspect its logs and artifact from the same workflow run and
confirm the candidate SHA and producer attempt. Integration and E2E failures
also retain run-specific `result.json` and service logs. Docker setup or
readiness failures require checking Docker Compose and image/network access;
cleanup failures should be handled only for that runner's named stack. A
missing or stale Dependency-Check cache requires a successful run of the
default-branch updater before retrying CI.

Historical pipeline design and hosted validation records are preserved in the
[CI implementation archive](archive/implementation-records/continuous-integration.md)
and the [Issue #47 validation archive](archive/implementation-records/issue-47-pipeline-validation.md).

## Continuous Delivery

### Triggers and eligibility

The [CD workflow](../.github/workflows/cd.yml) receives completed CI runs for
`main`. Its publication job runs only for a successful push CI run from this
repository. It checks out the CI candidate SHA, validates staging origins,
confirms that SHA is still the remote `main` tip, and requires exactly two
parents. Pull requests, merge groups, failed CI, foreign runs, stale candidates,
and commits that fail these safeguards cannot publish or deploy. Every eligible
merge deploys both services, including documentation-only changes. The deploy
helper checks the current `main` tip again immediately before each service
request.

### Container images and staging deployment

CD builds the frontend and backend Linux AMD64 images and publishes them to
GitHub Container Registry (GHCR), tagged with the full source SHA. The frontend
build embeds the configured staging backend API URL. Image labels identify the
source repository and revision. After validating both returned SHA-256 digests,
the workflow records immutable `image@sha256:...` references, source SHA, and
CI and CD run identities in its summary and the
`staging-images-<sha>-<run>-<attempt>` artifact. Publication must finish
successfully before deployment starts; a partial publication does not deploy.

The deployment job targets the configured Render staging backend and frontend.
It requires a correctly formatted smoke fixture secret before making deployment
requests. The helper requests the backend digest first, waits for its Render
deploy to become `live` on that exact digest, and requires `/api/health` to
return HTTP 200 and `status: OK`. It then requests the frontend digest and
likewise verifies its live status and image reference. Invalid configuration,
stale source, failed requests, terminal status, digest mismatch, or timeout
fails the job. A Render HTTP 202 is treated as a failure even though a queued
deployment may still run.

CD shares a serialized concurrency group with manual rollback; runs do not
cancel an in-progress run, and the queue can hold up to 100 pending runs.
Deployments started outside these workflows are not coordinated. A failed run
does not automatically undo a completed service deployment. For example, if
`main` advances after the backend is live, the frontend request can be stopped,
leaving a mixed pair until a subsequent deployment or recovery.

### Post-deployment verification and history

After both deployments succeed, the separate staging Playwright job runs three
smoke checks: backend/database health, login and rejected synthetic credentials,
and loading a dedicated unsubmitted synthetic evaluation. It requires the
configured fixture token and a separately provisioned fixture. The deployment
summary and `staging-deployment-<sha>-<run>-<attempt>` artifact record digest
references, service and deploy IDs, statuses, backend health, and failure phase.
The `staging-smoke-<sha>-<run>-<attempt>` artifact contains bounded, sanitized
check results tied to the SHA and image pair. Artifacts can be incomplete after
early failures and are subject to Actions retention.

Only after publication, deployment, smoke execution, and artifact uploads
succeed does CD validate the same-run deployment and smoke evidence. It requires
matching source and image references, configured service IDs, live deploys,
healthy backend, and exactly the three required passing checks. It then creates
an annotated `staging-success/cd-<run>-<attempt>` tag on the source commit.
Its versioned manifest records the source SHA, image digests, service and deploy
IDs, workflow run and attempt, and passing check names. The workflow rejects an
existing tag, pushes without force, and verifies the remote tag object. Valid
success tags can be selected as rollback targets, subject to rollback's own
validation. See [staging operations](staging-operations.md#manual-staging-rollback) for
rollback, recovery, and historical backfill procedures.

History records the verified outcome at that time; it does not guarantee that
images remain available or are compatible with current data and configuration.
Tags are append-only by convention, not protected against privileged changes
without a tag ruleset. A later CD run can replace a manually restored version.
Earlier selective deployment, drift checks, and the `staging-last-success`
baseline marker are superseded: current CD neither skips based on changed paths
or drift nor reads or moves that marker. Historical decisions and evidence are
in the [CD simplification record](archive/implementation-records/staging-cd-simplification-2026-11-14.md)
and [success-history record](archive/implementation-records/staging-success-history-2026-11-14.md).

### Delivery troubleshooting

Open the CD run in GitHub Actions and inspect the job outcomes, logs, summaries,
and artifacts from the same run and attempt. The recovery guidance summary
identifies failed stages and links to the separate rollback workflow.

- **Eligibility:** compare the triggering CI event, repository, result and SHA
  with the current `main` tip and the commit's parent count; check origin
  validation errors. A skipped publication job may indicate an ineligible run.
- **Publication:** inspect GHCR authentication, build and push logs, digest
  validation, and the image artifact. One image may have been published even
  when the job fails; deployment requires the whole job to succeed.
- **Render deployment:** inspect the deployment artifact's phase, deploy IDs,
  statuses and digest refs alongside Render's service and deployment logs. A
  timeout, ambiguous request, or HTTP 202 can leave a deployment running;
  inspect Render before retrying.
- **Backend health:** inspect the recorded HTTP/status result and backend
  Render logs, including database connectivity. Frontend deployment does not
  start until the health check passes.
- **Smoke checks:** inspect the smoke job and bounded artifact for the failed
  check and diagnostic; verify fixture and staging configuration. See
  [staging operations](staging-operations.md#smoke-verification) for manual
  verification and troubleshooting.
- **History:** inspect evidence validation, artifact availability and tag-push
  logs. A history failure can occur after both services and smoke checks succeed;
  inspect the remote tag and its manifest before treating a run as recorded.
